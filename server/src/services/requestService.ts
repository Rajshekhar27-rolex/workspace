import { prisma } from '../db';
import {
  CreateRequestInput,
  UpdateRequestInput,
  ConvertRequestInput,
  RequestStatus,
} from '../schemas/requestSchemas';

export class RequestService {
  /**
   * List customer requests strictly scoped to the user's workspace.
   */
  async listRequests(workspaceId: string, status?: RequestStatus) {
    return prisma.customerRequest.findMany({
      where: {
        workspaceId,
        ...(status ? { status } : {}),
      },
      include: {
        workItem: true,
        _count: {
          select: { activities: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Retrieve a single customer request by ID, scoped to the user's workspace.
   * Returns null if not found or if the record belongs to another workspace.
   */
  async getRequestById(id: string, workspaceId: string) {
    return prisma.customerRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        workItem: true,
        activities: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  /**
   * Create a new customer request in the user's workspace, atomically creating
   * the initial CREATED audit activity log.
   */
  async createRequest(workspaceId: string, userId: string, data: CreateRequestInput) {
    return prisma.$transaction(async (tx) => {
      const newRequest = await tx.customerRequest.create({
        data: {
          workspaceId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone || null,
          requestedService: data.requestedService,
          details: data.details || null,
          status: data.status || 'NEW',
        },
      });

      await tx.activity.create({
        data: {
          requestId: newRequest.id,
          userId,
          action: 'CREATED',
          details: `Request registered with status ${newRequest.status}.`,
        },
      });

      return tx.customerRequest.findUnique({
        where: { id: newRequest.id },
        include: {
          workItem: true,
          activities: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Update a customer request within the user's workspace.
   * If the record does not exist or belongs to another workspace, returns null.
   * Generates appropriate audit activity logs atomically.
   */
  async updateRequest(id: string, workspaceId: string, userId: string, data: UpdateRequestInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify existence strictly within this workspace inside the transaction
      const existing = await tx.customerRequest.findFirst({
        where: {
          id,
          workspaceId,
        },
      });

      if (!existing) {
        return null;
      }

      // Check if status changed
      if (data.status && data.status !== existing.status) {
        await tx.activity.create({
          data: {
            requestId: id,
            userId,
            action: 'STATUS_CHANGED',
            details: `Status transitioned from ${existing.status} to ${data.status}.`,
          },
        });
      } else {
        // Record general update activity
        await tx.activity.create({
          data: {
            requestId: id,
            userId,
            action: 'UPDATED',
            details: 'Customer request details updated.',
          },
        });
      }

      const updated = await tx.customerRequest.update({
        where: { id },
        data: {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone === undefined ? undefined : data.customerPhone,
          requestedService: data.requestedService,
          details: data.details === undefined ? undefined : data.details,
          status: data.status,
        },
        include: {
          workItem: true,
          activities: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      return updated;
    });
  }

  /**
   * Convert a QUALIFIED request into a scheduled WorkItem.
   * Enforces:
   * - Scoping to user's workspace
   * - Request must be QUALIFIED (rejects NEW, CLOSED)
   * - Atomic creation of WorkItem + Activity entry
   * - Concurrency deduplication at DB level (returns ALREADY_CONVERTED on P2002)
   */
  async convertToWorkItem(
    requestId: string,
    workspaceId: string,
    userId: string,
    data: ConvertRequestInput
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Scoped request lookup
        const request = await tx.customerRequest.findFirst({
          where: {
            id: requestId,
            workspaceId,
          },
          include: {
            workItem: true,
          },
        });

        if (!request) {
          return { success: false as const, error: 'NOT_FOUND' as const };
        }

        // 2. Reject requests that are not QUALIFIED (e.g. NEW, CLOSED)
        if (request.status !== 'QUALIFIED') {
          return {
            success: false as const,
            error: 'NOT_QUALIFIED' as const,
            currentStatus: request.status,
          };
        }

        // 3. Application-level deduplication check
        if (request.workItem) {
          return { success: false as const, error: 'ALREADY_CONVERTED' as const };
        }

        const scheduledDateObj = new Date(data.scheduledDate);

        // 4. Create WorkItem (enforces @unique([requestId]) at database level)
        const workItem = await tx.workItem.create({
          data: {
            workspaceId,
            requestId,
            scheduledDate: scheduledDateObj,
            notes: data.notes || null,
          },
        });

        // 5. Create Activity record
        await tx.activity.create({
          data: {
            requestId,
            userId,
            action: 'CONVERTED_TO_WORK_ITEM',
            details: `Converted to work item scheduled for ${scheduledDateObj.toISOString()}.${
              data.notes ? ` Notes: ${data.notes}` : ''
            }`,
          },
        });

        const updatedRequest = await tx.customerRequest.findUnique({
          where: { id: requestId },
          include: {
            workItem: true,
            activities: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        return {
          success: true as const,
          workItem,
          request: updatedRequest,
        };
      });
    } catch (err: any) {
      // Prisma P2002 represents Unique constraint violation on requestId
      if (err.code === 'P2002') {
        return { success: false as const, error: 'ALREADY_CONVERTED' as const };
      }
      throw err;
    }
  }
}

export const requestService = new RequestService();
