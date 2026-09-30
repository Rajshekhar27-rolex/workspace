import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { seed } from '../prisma/seed';

describe('Authentication & Identity Verification API', () => {
  let userA: { id: string; name: string; email: string; workspaceId: string };
  let userB: { id: string; name: string; email: string; workspaceId: string };
  let workspaceBId: string;

  beforeAll(async () => {
    const seeded = await seed();
    userA = seeded.userA;
    userB = seeded.userB;
    workspaceBId = seeded.workspaceB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/auth/users', () => {
    it('should list seeded users with their workspace metadata for context switching', async () => {
      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);

      const foundAlice = res.body.users.find((u: any) => u.email === userA.email);
      const foundBob = res.body.users.find((u: any) => u.email === userB.email);

      expect(foundAlice).toBeDefined();
      expect(foundAlice.workspaceName).toBe('Apex Auto Repair');
      expect(foundBob).toBeDefined();
      expect(foundBob.workspaceName).toBe('Bright Horizon Cleaning');
    });

    it('REGRESSION: should only expose safe public fields and never leak internal secrets or tokens', async () => {
      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(200);
      for (const u of res.body.users) {
        // Must contain only expected keys
        const keys = Object.keys(u);
        expect(keys.sort()).toEqual(['email', 'id', 'name', 'workspaceId', 'workspaceName'].sort());
        expect(u.password).toBeUndefined();
        expect(u.token).toBeUndefined();
        expect(u.hash).toBeUndefined();
      }
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate successfully with a valid userId', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: userA.id });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userA.id);
      expect(res.body.user.workspaceId).toBe(userA.workspaceId);
      expect(res.body.token).toBe(userA.id);
    });

    it('should authenticate successfully with a valid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userB.email });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userB.id);
      expect(res.body.user.workspaceId).toBe(userB.workspaceId);
    });

    it('should reject login with non-existent user credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject empty login payload with 400', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me (Protected Route & Identity Resolution)', () => {
    it('should reject requests without authentication credentials with 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid user ID in header with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('x-user-id', 'invalid-user-uuid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should authenticate User A via x-user-id and resolve correct workspaceId', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('x-user-id', userA.id);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: userA.id,
        name: userA.name,
        email: userA.email,
        workspaceId: userA.workspaceId,
        workspaceName: 'Apex Auto Repair',
      });
    });

    it('should authenticate User B via Bearer token and resolve correct workspaceId', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userB.id}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: userB.id,
        name: userB.name,
        email: userB.email,
        workspaceId: userB.workspaceId,
        workspaceName: 'Bright Horizon Cleaning',
      });
    });

    it('CRITICAL: must ignore client-supplied workspace tampering in headers', async () => {
      // User A attempts to claim they belong to Workspace B by sending a spoofed header
      const res = await request(app)
        .get('/api/auth/me')
        .set('x-user-id', userA.id)
        .set('x-workspace-id', workspaceBId);

      expect(res.status).toBe(200);
      // Backend must strictly resolve to User A's actual workspaceId from the database
      expect(res.body.user.workspaceId).toBe(userA.workspaceId);
      expect(res.body.user.workspaceId).not.toBe(workspaceBId);
    });
  });
});
