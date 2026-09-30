import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health Check API', () => {
  it('should return 200 OK and health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'client-request-desk-api');
    expect(response.body).toHaveProperty('timestamp');
  });
});
