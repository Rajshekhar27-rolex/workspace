import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { seed } from '../prisma/seed';

describe('Milestone 5: Qualified Request to Work-Item Conversion', () => {
  let userA: { id: string; name: string; email: string; workspaceId: string };
  let userB: { id: string; name: string; email: string; workspaceId: string };
  let workspaceAId: string;
  let workspaceBId: string;

  beforeAll(async () => {
    const seeded = await seed();
    userA = seeded.userA;
    userB = seeded.userB;
    workspaceAId = seeded.workspaceA.id;
    workspaceBId = seeded.workspaceB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication Enforcement', () => {
    it('should reject unauthenticated POST /api/requests/:id/work-item with 401', async () => {
      const res = await request(app)
        .post('/api/requests/some-id/work-item')
        .send({ scheduledDate: '2026-11-01T10:00:00Z' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Validation & Eligibility Rules', () => {
    it('should reject requests with invalid scheduledDate with 400', async () => {
      // Find a QUALIFIED unconverted request in Workspace A
      const qualifiedReq = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceAId,
          status: 'QUALIFIED',
          workItem: null,
        },
      });
      expect(qualifiedReq).not.toBeNull();

      const res = await request(app)
        .post(`/api/requests/${qualifiedReq!.id}/work-item`)
        .set('x-user-id', userA.id)
        .send({
          scheduledDate: 'not-a-valid-date',
          notes: 'Test notes',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject converting a NEW request with 400 Bad Request', async () => {
      // Find a NEW request in Workspace A
      const newReq = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceAId,
          status: 'NEW',
        },
      });
      expect(newReq).not.toBeNull();

      const res = await request(app)
        .post(`/api/requests/${newReq!.id}/work-item`)
        .set('x-user-id', userA.id)
        .send({
          scheduledDate: '2026-11-01T10:00:00Z',
          notes: 'Attempting to convert NEW request',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REQUEST_NOT_QUALIFIED');
      expect(res.body.error.message).toContain('QUALIFIED');
      expect(res.body.error.message).toContain('NEW');

      // Verify no work item was created
      const workItemCount = await prisma.workItem.count({
        where: { requestId: newReq!.id },
      });
      expect(workItemCount).toBe(0);
    });

    it('should reject converting a CLOSED request with 400 Bad Request', async () => {
      // Find a CLOSED request in Workspace A
      const closedReq = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceAId,
          status: 'CLOSED',
        },
      });
      expect(closedReq).not.toBeNull();

      const res = await request(app)
        .post(`/api/requests/${closedReq!.id}/work-item`)
        .set('x-user-id', userA.id)
        .send({
          scheduledDate: '2026-11-01T10:00:00Z',
          notes: 'Attempting to convert CLOSED request',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REQUEST_NOT_QUALIFIED');
      expect(res.body.error.message).toContain('CLOSED');

      // Verify no work item was created
      const workItemCount = await prisma.workItem.count({
        where: { requestId: closedReq!.id },
      });
      expect(workItemCount).toBe(0);
    });
  });

  describe('Successful Conversion & Activity Creation', () => {
    it('should successfully convert a QUALIFIED request, create WorkItem and Activity log atomically', async () => {
      // Find an unconverted QUALIFIED request in Workspace A
      const qualifiedReq = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceAId,
          status: 'QUALIFIED',
          workItem: null,
        },
      });
      expect(qualifiedReq).not.toBeNull();

      const scheduledDate = '2026-11-10T14:30:00.000Z';
      const notes = 'Assigned to senior technician with standard warranty.';

      const res = await request(app)
        .post(`/api/requests/${qualifiedReq!.id}/work-item`)
        .set('x-user-id', userA.id)
        .send({
          scheduledDate,
          notes,
        });

      expect(res.status).toBe(201);
      expect(res.body.workItem).toBeDefined();
      expect(res.body.workItem.requestId).toBe(qualifiedReq!.id);
      expect(res.body.workItem.workspaceId).toBe(workspaceAId);
      expect(new Date(res.body.workItem.scheduledDate).toISOString()).toBe(new Date(scheduledDate).toISOString());
      expect(res.body.workItem.notes).toBe(notes);

      // Verify workItem in database
      const dbWorkItem = await prisma.workItem.findUnique({
        where: { requestId: qualifiedReq!.id },
      });
      expect(dbWorkItem).not.toBeNull();
      expect(dbWorkItem?.notes).toBe(notes);

      // Verify Activity log was created with correct attributes
      const activities = await prisma.activity.findMany({
        where: { requestId: qualifiedReq!.id },
        orderBy: { createdAt: 'asc' },
      });
      const conversionActivity = activities.find((a) => a.action === 'CONVERTED_TO_WORK_ITEM');
      expect(conversionActivity).toBeDefined();
      expect(conversionActivity?.userId).toBe(userA.id);
      expect(conversionActivity?.details).toContain('Converted to work item');
      expect(conversionActivity?.details).toContain(notes);
      expect(conversionActivity?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Deduplication & Duplicate Prevention', () => {
    it('should return 409 Conflict when converting an already converted request', async () => {
      // Find a request in Workspace A that already has a workItem (e.g. from seed or prior test)
      const convertedReq = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceAId,
          workItem: { isNot: null },
        },
      });
      expect(convertedReq).not.toBeNull();

      // Attempt to submit conversion again
      const res = await request(app)
        .post(`/api/requests/${convertedReq!.id}/work-item`)
        .set('x-user-id', userA.id)
        .send({
          scheduledDate: '2026-11-20T10:00:00Z',
          notes: 'Second attempt should fail',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_CONVERTED');
      expect(res.body.error.message).toContain('already been created');

      // Verify exactly 1 work item exists in database for this request
      const workItems = await prisma.workItem.findMany({
        where: { requestId: convertedReq!.id },
      });
      expect(workItems.length).toBe(1);
    });

    it('should handle simulated concurrent conversion race conditions via database unique constraint', async () => {
      // Create a brand new QUALIFIED request to test concurrency
      const freshReq = await prisma.customerRequest.create({
        data: {
          workspaceId: workspaceAId,
          customerName: 'Concurrency Test Customer',
          customerEmail: 'concurrent@example.com',
          requestedService: 'Transmission Inspection',
          status: 'QUALIFIED',
        },
      });

      // Fire two conversion requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/requests/${freshReq.id}/work-item`)
          .set('x-user-id', userA.id)
          .send({ scheduledDate: '2026-12-01T09:00:00Z', notes: 'First runner' }),
        request(app)
          .post(`/api/requests/${freshReq.id}/work-item`)
          .set('x-user-id', userA.id)
          .send({ scheduledDate: '2026-12-01T09:00:00Z', notes: 'Second runner' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed with 201, and the other must fail with 409
      expect(statuses).toEqual([201, 409]);

      // Exactly one WorkItem exists
      const count = await prisma.workItem.count({
        where: { requestId: freshReq.id },
      });
      expect(count).toBe(1);
    });
  });

  describe('Cross-Workspace Conversion Protection (CRITICAL)', () => {
    it('CRITICAL: should return 404 NOT FOUND when User A attempts to convert Workspace B request', async () => {
      // Pick a QUALIFIED request belonging strictly to Workspace B
      const wsBRequest = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceBId,
          status: 'QUALIFIED',
        },
      });
      expect(wsBRequest).not.toBeNull();

      // User A attempts to convert Workspace B's request
      const res = await request(app)
        .post(`/api/requests/${wsBRequest!.id}/work-item`)
        .set('x-user-id', userA.id) // Authenticated as User A
        .send({
          scheduledDate: '2026-11-25T11:00:00Z',
          notes: 'Malicious cross-workspace conversion attempt',
        });

      // MUST be 404 Not Found to prevent existence probing
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Verify no work item was created for Workspace B's request
      const workItemCount = await prisma.workItem.count({
        where: { requestId: wsBRequest!.id },
      });
      expect(workItemCount).toBe(0);
    });
  });

  describe('Failure and Rollback Atomicity', () => {
    it('should roll back work item creation if activity creation fails inside transaction', async () => {
      // Create a test request
      const testReq = await prisma.customerRequest.create({
        data: {
          workspaceId: workspaceAId,
          customerName: 'Rollback Test User',
          customerEmail: 'rollback@example.com',
          requestedService: 'Radiator Flush',
          status: 'QUALIFIED',
        },
      });

      // We test atomicity by simulating transaction failure:
      // If we attempt a conversion where activity creation triggers a foreign key error
      // (e.g. passing a non-existent userId inside a custom service transaction call)
      let transactionError: any = null;
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Create work item
          await tx.workItem.create({
            data: {
              workspaceId: workspaceAId,
              requestId: testReq.id,
              scheduledDate: new Date('2026-11-30T10:00:00Z'),
            },
          });

          // 2. Intentionally throw an error simulating activity failure
          throw new Error('Simulated activity logging failure');
        });
      } catch (err) {
        transactionError = err;
      }

      expect(transactionError).not.toBeNull();
      expect(transactionError.message).toBe('Simulated activity logging failure');

      // Verify WorkItem was rolled back and DOES NOT exist in the database!
      const rolledBackWorkItem = await prisma.workItem.findUnique({
        where: { requestId: testReq.id },
      });
      expect(rolledBackWorkItem).toBeNull();
    });
  });
});
