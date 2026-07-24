import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app';
import request from 'supertest';

const app = createApp();
let authToken = '';

describe('POST-REFACTOR API Smoke Tests — SUPERTEST', () => {
  describe('GET /api/health', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('database');
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects invalid credentials with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'bad@email.com', password: 'bad' });
      expect(res.status).toBe(401);
    });

    it('accepts valid credentials and returns token', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'admin@pethub.com', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('role', 'ADMIN');
      authToken = res.body.token;
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });

    it('rejects without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/branches', () => {
    it('returns array of branches', async () => {
      const res = await request(app).get('/api/branches').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/employees', () => {
    it('returns array of employees', async () => {
      const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('position');
    });
  });

  describe('GET /api/payroll', () => {
    it('returns payroll periods', async () => {
      const res = await request(app).get('/api/payroll').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/payroll/create-period', () => {
    it('creates payroll periods', async () => {
      const res = await request(app)
        .post('/api/payroll/create-period')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ branchId: 1, startDate: '2026-08-01T00:00:00.000Z', endDate: '2026-08-15T00:00:00.000Z', workingDays: 15 });
      expect(res.status).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('returns dashboard stats', async () => {
      const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalBranches');
      expect(res.body).toHaveProperty('totalEmployees');
    });
  });

  describe('401 / 404 error shapes', () => {
    it('401 returns { error: string }', async () => {
      const res = await request(app).get('/api/branches');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('404 returns { error: string }', async () => {
      const res = await request(app).get('/api/payroll/99999').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
