import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { seed } from '../prisma/seed';

describe('Customer Requests API (CRUD & Multi-Tenant Isolation)', () => {
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
    it('should reject unauthenticated GET /api/requests with 401', async () => {
      const res = await request(app).get('/api/requests');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject unauthenticated POST /api/requests with 401', async () => {
      const res = await request(app).post('/api/requests').send({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        requestedService: 'Service Check',
      });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/requests/:id with 401', async () => {
      const res = await request(app).get('/api/requests/some-id');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated PATCH /api/requests/:id with 401', async () => {
      const res = await request(app).patch('/api/requests/some-id').send({
        status: 'QUALIFIED',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/requests (List & Status Filtering)', () => {
    it('should return only requests belonging to the authenticated user workspace', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.requests)).toBe(true);
      expect(res.body.requests.length).toBeGreaterThan(0);

      // Verify strict isolation: all requests must belong to Workspace A
      for (const reqItem of res.body.requests) {
        expect(reqItem.workspaceId).toBe(workspaceAId);
        expect(reqItem.workspaceId).not.toBe(workspaceBId);
      }
    });

    it('should filter requests by status NEW', async () => {
      const res = await request(app)
        .get('/api/requests?status=NEW')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThan(0);
      for (const reqItem of res.body.requests) {
        expect(reqItem.status).toBe('NEW');
      }
    });

    it('should filter requests by status QUALIFIED', async () => {
      const res = await request(app)
        .get('/api/requests?status=QUALIFIED')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThan(0);
      for (const reqItem of res.body.requests) {
        expect(reqItem.status).toBe('QUALIFIED');
      }
    });

    it('should filter requests by status CLOSED', async () => {
      const res = await request(app)
        .get('/api/requests?status=CLOSED')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThan(0);
      for (const reqItem of res.body.requests) {
        expect(reqItem.status).toBe('CLOSED');
      }
    });

    it('should reject invalid status query parameter with 400', async () => {
      const res = await request(app)
        .get('/api/requests?status=INVALID_STATUS')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('REGRESSION: should ignore client-supplied workspaceId query param and enforce authenticated workspace', async () => {
      // User A attempts to filter or read Workspace B's requests by passing ?workspaceId=workspaceBId
      const res = await request(app)
        .get(`/api/requests?workspaceId=${workspaceBId}`)
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThan(0);
      // Every returned request MUST strictly belong to Workspace A
      for (const reqItem of res.body.requests) {
        expect(reqItem.workspaceId).toBe(workspaceAId);
        expect(reqItem.workspaceId).not.toBe(workspaceBId);
      }
    });
  });

  describe('POST /api/requests (Creation & Validation)', () => {
    it('should create a request and automatically assign authenticated workspaceId', async () => {
      const payload = {
        customerName: 'Jonathan Harker',
        customerEmail: 'jharker@example.com',
        customerPhone: '555-4321',
        requestedService: 'Windshield Wiper Motor Replacement',
        details: 'Intermittent wiper failure in heavy rain.',
      };

      const res = await request(app)
        .post('/api/requests')
        .set('x-user-id', userA.id)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.customerName).toBe(payload.customerName);
      expect(res.body.request.status).toBe('NEW');
      // Strictly assigned to User A's workspace
      expect(res.body.request.workspaceId).toBe(workspaceAId);

      // Verify audit activity was created atomically
      expect(res.body.request.activities).toBeDefined();
      expect(res.body.request.activities.length).toBe(1);
      expect(res.body.request.activities[0].action).toBe('CREATED');
      expect(res.body.request.activities[0].user.id).toBe(userA.id);
    });

    it('should ignore any workspaceId passed in the body by client and use authenticated workspace', async () => {
      const payload = {
        workspaceId: workspaceBId, // Malicious attempt to create in Workspace B while authenticated as User A
        customerName: 'Sneaky Client',
        customerEmail: 'sneaky@example.com',
        requestedService: 'Unauthorized Oil Service',
      };

      const res = await request(app)
        .post('/api/requests')
        .set('x-user-id', userA.id)
        .send(payload);

      expect(res.status).toBe(201);
      // Must be created in Workspace A, ignoring the payload's workspaceId
      expect(res.body.request.workspaceId).toBe(workspaceAId);
      expect(res.body.request.workspaceId).not.toBe(workspaceBId);
    });

    it('should return 400 when customerName is too short', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('x-user-id', userA.id)
        .send({
          customerName: 'J',
          customerEmail: 'valid@example.com',
          requestedService: 'Brake Check',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'customerName')).toBe(true);
    });

    it('should return 400 when customerEmail is invalid', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('x-user-id', userA.id)
        .send({
          customerName: 'John Doe',
          customerEmail: 'not-an-email',
          requestedService: 'Brake Check',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'customerEmail')).toBe(true);
    });

    it('should return 400 when requestedService is missing', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('x-user-id', userA.id)
        .send({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/requests/:id (Details & Cross-Workspace Tampering Defense)', () => {
    it('should return 200 and request details for an ID belonging to the user workspace', async () => {
      // Find a request in Workspace A
      const reqA = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceAId },
      });
      expect(reqA).not.toBeNull();

      const res = await request(app)
        .get(`/api/requests/${reqA!.id}`)
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(res.body.request.id).toBe(reqA!.id);
      expect(res.body.request.workspaceId).toBe(workspaceAId);
      expect(Array.isArray(res.body.request.activities)).toBe(true);
    });

    it('CRITICAL: should return 404 NOT FOUND when accessing an ID from another workspace', async () => {
      // Pick a request belonging strictly to Workspace B
      const reqB = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceBId },
      });
      expect(reqB).not.toBeNull();

      // User A attempts to view Workspace B's request by tampering with the URL ID
      const res = await request(app)
        .get(`/api/requests/${reqB!.id}`)
        .set('x-user-id', userA.id); // Authenticated as User A

      // CRITICAL SECURITY RULE: Must be 404, NEVER 403 or 200
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when request ID does not exist', async () => {
      const res = await request(app)
        .get('/api/requests/00000000-0000-0000-0000-000000000000')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/requests/:id (Updates & Cross-Workspace Tampering Defense)', () => {
    it('should update request status and record audit activity', async () => {
      // Find a NEW request in Workspace A
      const reqA = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceAId, status: 'NEW' },
      });
      expect(reqA).not.toBeNull();

      const res = await request(app)
        .patch(`/api/requests/${reqA!.id}`)
        .set('x-user-id', userA.id)
        .send({
          status: 'QUALIFIED',
          details: 'Inspected vehicle and approved service request.',
        });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('QUALIFIED');
      expect(res.body.request.details).toBe('Inspected vehicle and approved service request.');

      // Verify audit activity was logged
      const latestActivity = res.body.request.activities[res.body.request.activities.length - 1];
      expect(latestActivity.action).toBe('STATUS_CHANGED');
      expect(latestActivity.details).toContain('QUALIFIED');
      expect(latestActivity.user.id).toBe(userA.id);
    });

    it('CRITICAL: should return 404 NOT FOUND when attempting to update an ID from another workspace', async () => {
      // Pick a request belonging strictly to Workspace B
      const reqB = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceBId },
      });
      expect(reqB).not.toBeNull();
      const initialStatus = reqB!.status;

      // User A attempts to mutate Workspace B's request
      const res = await request(app)
        .patch(`/api/requests/${reqB!.id}`)
        .set('x-user-id', userA.id)
        .send({
          status: 'CLOSED',
          details: 'Tampered by User A',
        });

      // Must respond with 404
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Verify database record in Workspace B was untouched
      const refreshed = await prisma.customerRequest.findUnique({
        where: { id: reqB!.id },
      });
      expect(refreshed?.status).toBe(initialStatus);
      expect(refreshed?.details).not.toBe('Tampered by User A');
    });

    it('should reject invalid email update with 400', async () => {
      const reqA = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceAId },
      });

      const res = await request(app)
        .patch(`/api/requests/${reqA!.id}`)
        .set('x-user-id', userA.id)
        .send({
          customerEmail: 'bad-email-format',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('REGRESSION: should ignore any workspaceId provided in PATCH body to prevent tenant reassignment', async () => {
      const reqA = await prisma.customerRequest.findFirst({
        where: { workspaceId: workspaceAId },
      });

      const res = await request(app)
        .patch(`/api/requests/${reqA!.id}`)
        .set('x-user-id', userA.id)
        .send({
          workspaceId: workspaceBId, // Attempt to reassign record to Workspace B
          details: 'Updated details without reassigning workspace',
        });

      expect(res.status).toBe(200);
      expect(res.body.request.workspaceId).toBe(workspaceAId);
      expect(res.body.request.workspaceId).not.toBe(workspaceBId);

      // Verify directly in DB
      const refreshed = await prisma.customerRequest.findUnique({
        where: { id: reqA!.id },
      });
      expect(refreshed?.workspaceId).toBe(workspaceAId);
    });
  });
});
