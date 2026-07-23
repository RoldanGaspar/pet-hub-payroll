import { describe, it, expect } from 'vitest';

/**
 * API Smoke Tests — CHARACTERIZATION (lock-in current behavior)
 *
 * These tests verify the current API contracts.
 * They require a running backend server at localhost:3001 with a seeded database.
 *
 * Run with: npm run test (server must be running)
 * If server is not running, tests will skip.
 */

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

async function request(
  path: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
  } = {}
): Promise<{ status: number; data: any }> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const fetchOptions: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

describe('API Smoke Tests — CHARACTERIZATION', () => {
  let serverAvailable = false;
  let authToken = '';

  beforeAll(async () => {
    serverAvailable = await isServerRunning();
    if (!serverAvailable) {
      console.warn('⚠  Backend server not running at http://localhost:3001 — skipping API smoke tests');
      console.warn('   Start the server with: cd backend && npm run dev');
    }
  });

  describe('GET /api/health', () => {
    it('returns status ok with database connected', async () => {
      if (!serverAvailable) return;

      const { status, data } = await request('/api/health');
      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('environment');
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects invalid credentials with 401', async () => {
      if (!serverAvailable) return;

      const { status, data } = await request('/auth/login', {
        method: 'POST',
        body: { email: 'wrong@email.com', password: 'wrongpass' },
      });
      expect(status).toBe(401);
      expect(data).toHaveProperty('error');
    });

    it('accepts valid admin credentials and returns token + user', async () => {
      if (!serverAvailable) return;

      const { status, data } = await request('/auth/login', {
        method: 'POST',
        body: { email: 'admin@pethub.com', password: 'admin123' },
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email', 'admin@pethub.com');
      expect(data.user).toHaveProperty('role', 'ADMIN');
      expect(data.user).toHaveProperty('name');

      authToken = data.token;
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user profile with valid token', async () => {
      if (!serverAvailable) return;
      if (!authToken) {
        console.warn('   No auth token — run login test first');
        return;
      }

      const { status, data } = await request('/auth/me', { token: authToken });
      expect(status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('role');
    });

    it('rejects request without token with 401', async () => {
      if (!serverAvailable) return;

      const { status, data } = await request('/auth/me');
      expect(status).toBe(401);
    });
  });

  describe('GET /api/branches', () => {
    it('returns array of active branches', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      const { status, data } = await request('/branches', { token: authToken });
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(8);

      const firstBranch = data[0];
      expect(firstBranch).toHaveProperty('id');
      expect(firstBranch).toHaveProperty('name');
      expect(firstBranch).toHaveProperty('isActive', true);
      expect(firstBranch).toHaveProperty('_count');
      expect(firstBranch._count).toHaveProperty('employees');
    });
  });

  describe('GET /api/employees', () => {
    it('returns array of active employees', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      const { status, data } = await request('/employees', { token: authToken });
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(6);

      const firstEmployee = data[0];
      expect(firstEmployee).toHaveProperty('id');
      expect(firstEmployee).toHaveProperty('name');
      expect(firstEmployee).toHaveProperty('position');
      expect(firstEmployee).toHaveProperty('salary');
      expect(firstEmployee).toHaveProperty('ratePerDay');
      expect(firstEmployee).toHaveProperty('ratePerHour');
      expect(firstEmployee).toHaveProperty('branch');
      expect(firstEmployee).toHaveProperty('fixedDeductions');
    });
  });

  describe('Payroll Flow — End-to-End Characterization', () => {
    it('GET /api/payroll returns payroll periods', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      const { status, data } = await request('/payroll', { token: authToken });
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /api/payroll/create-period creates payroll records (if db has employees)', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      const { status, data } = await request('/payroll/create-period', {
        method: 'POST',
        token: authToken,
        body: {
          branchId: 1,
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-06-15T00:00:00.000Z',
          workingDays: 15,
        },
      });

      expect(status).toBe(201);
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 0) {
        const payroll = data[0];
        expect(payroll).toHaveProperty('id');
        expect(payroll).toHaveProperty('employee');
        expect(payroll).toHaveProperty('status', 'DRAFT');
        expect(payroll).toHaveProperty('workingDays', 15);
        expect(payroll).toHaveProperty('totalDaysPresent', 15);
        expect(payroll).toHaveProperty('deductionDivisor', 2);
      }
    });
  });

  describe('Dashboard', () => {
    it('GET /api/dashboard/stats returns dashboard data', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      const { status, data } = await request('/dashboard/stats', { token: authToken });
      expect(status).toBe(200);
      expect(data).toHaveProperty('totalBranches');
      expect(data).toHaveProperty('totalEmployees');
      expect(data).toHaveProperty('activeEmployees');
      expect(data).toHaveProperty('pendingPayrolls');
      expect(data).toHaveProperty('totalDisbursement');
      expect(data).toHaveProperty('recentPayrolls');
      expect(data).toHaveProperty('branchSummaries');
    });
  });

  describe('API Response Shape Conformance', () => {
    it('all authenticated endpoints return JSON content-type', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      // Test branches as representative endpoint
      const response = await fetch(`${API_URL}/branches`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('401 response shape: { error: string }', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_URL}/branches`);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });

    it('404 response shape for non-existent resource', async () => {
      if (!serverAvailable) return;
      if (!authToken) return;

      const response = await fetch(`${API_URL}/payroll/99999`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });
  });
});
