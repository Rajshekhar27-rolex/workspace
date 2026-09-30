import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/db';
import { seed } from '../prisma/seed';

describe('Database Schema & Isolation Verification', () => {
  let workspaceAId: string;
  let workspaceBId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Run seed to ensure deterministic state
    const seeded = await seed();
    workspaceAId = seeded.workspaceA.id;
    workspaceBId = seeded.workspaceB.id;
    userAId = seeded.userA.id;
    userBId = seeded.userB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Relational Models & Cardinality', () => {
    it('should confirm Workspace A has User A and Workspace B has User B', async () => {
      const wsA = await prisma.workspace.findUnique({
        where: { id: workspaceAId },
        include: { users: true },
      });
      const wsB = await prisma.workspace.findUnique({
        where: { id: workspaceBId },
        include: { users: true },
      });

      expect(wsA).not.toBeNull();
      expect(wsA?.users.length).toBeGreaterThanOrEqual(1);
      expect(wsA?.users[0].id).toBe(userAId);

      expect(wsB).not.toBeNull();
      expect(wsB?.users.length).toBeGreaterThanOrEqual(1);
      expect(wsB?.users[0].id).toBe(userBId);
    });

    it('should support request statuses NEW, QUALIFIED, CLOSED', async () => {
      const statuses = await prisma.customerRequest.findMany({
        where: { workspaceId: workspaceAId },
        select: { status: true },
      });

      const uniqueStatuses = new Set(statuses.map((s) => s.status));
      expect(uniqueStatuses.has('NEW')).toBe(true);
      expect(uniqueStatuses.has('QUALIFIED')).toBe(true);
      expect(uniqueStatuses.has('CLOSED')).toBe(true);
    });

    it('should record activity logs linked to request and user with timestamps', async () => {
      const activities = await prisma.activity.findMany({
        include: {
          request: true,
          user: true,
        },
      });

      expect(activities.length).toBeGreaterThan(0);
      for (const act of activities) {
        expect(act.requestId).toBeDefined();
        expect(act.userId).toBeDefined();
        expect(act.action).toBeDefined();
        expect(act.createdAt).toBeInstanceOf(Date);
        expect(act.request).not.toBeNull();
        expect(act.user).not.toBeNull();
      }
    });
  });

  describe('Database-Level Constraints & Deduplication', () => {
    it('should enforce unique WorkItem per CustomerRequest at the database level', async () => {
      // Find a qualified request in Workspace A that already has a workItem
      const requestWithWorkItem = await prisma.customerRequest.findFirst({
        where: {
          workspaceId: workspaceAId,
          workItem: { isNot: null },
        },
        include: { workItem: true },
      });

      expect(requestWithWorkItem).not.toBeNull();
      expect(requestWithWorkItem?.workItem).not.toBeNull();

      // Attempt to directly insert a second WorkItem targeting the same requestId
      let duplicateError: any = null;
      try {
        await prisma.workItem.create({
          data: {
            workspaceId: workspaceAId,
            requestId: requestWithWorkItem!.id,
            scheduledDate: new Date('2026-11-01T10:00:00Z'),
            notes: 'Duplicate attempt',
          },
        });
      } catch (err: any) {
        duplicateError = err;
      }

      // Prisma P2002 represents Unique constraint violation
      expect(duplicateError).not.toBeNull();
      expect(duplicateError.code).toBe('P2002');
      expect(duplicateError.meta?.target).toContain('requestId');
    });
  });

  describe('Workspace Isolation Query Semantics', () => {
    it('should ensure querying requests for Workspace A yields zero records from Workspace B', async () => {
      const wsARequests = await prisma.customerRequest.findMany({
        where: { workspaceId: workspaceAId },
      });

      const wsBRequests = await prisma.customerRequest.findMany({
        where: { workspaceId: workspaceBId },
      });

      expect(wsARequests.length).toBeGreaterThan(0);
      expect(wsBRequests.length).toBeGreaterThan(0);

      // Verify no intersection of request IDs
      const wsARequestIds = new Set(wsARequests.map((r) => r.id));
      const crossContamination = wsBRequests.some((r) => wsARequestIds.has(r.id));
      expect(crossContamination).toBe(false);

      // Verify every request in wsARequests strictly has workspaceId === workspaceAId
      for (const req of wsARequests) {
        expect(req.workspaceId).toBe(workspaceAId);
      }
    });

    it('should return null when querying Workspace B request ID with Workspace A scoping', async () => {
      // Pick a real request belonging to Workspace B
      const wsBRequest = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceBId },
      });
      expect(wsBRequest).not.toBeNull();

      // Attempt to access it while scoped to Workspace A
      const crossTenantResult = await prisma.customerRequest.findFirst({
        where: {
          id: wsBRequest!.id,
          workspaceId: workspaceAId, // scoping to Workspace A
        },
      });

      // Crucial: Must be null (cannot be found under Workspace A)
      expect(crossTenantResult).toBeNull();
    });

    it('should prevent cross-workspace update via workspace scoping', async () => {
      const wsBRequest = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceBId },
      });
      expect(wsBRequest).not.toBeNull();

      // Attempting to update a Workspace B record while scoping to Workspace A
      const updateResult = await prisma.customerRequest.updateMany({
        where: {
          id: wsBRequest!.id,
          workspaceId: workspaceAId,
        },
        data: {
          status: 'CLOSED',
        },
      });

      // No records updated
      expect(updateResult.count).toBe(0);

      // Verify original record in Workspace B was not modified
      const unmanipulated = await prisma.customerRequest.findUnique({
        where: { id: wsBRequest!.id },
      });
      expect(unmanipulated?.status).toBe(wsBRequest?.status);
    });
  });
});
