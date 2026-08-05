import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

describe('API Integration Health Check', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
  });

  it('GET /api/v1/docs should render Swagger UI documentation', async () => {
    const res = await request(app).get('/api/v1/docs/');
    expect(res.status).toBe(200);
  });
});
