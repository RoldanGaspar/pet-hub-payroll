import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Branch API
export const branchApi = {
  getAll: () => api.get('/branches'),
  getById: (id: number) => api.get(`/branches/${id}`),
  create: (data: { name: string; address: string; contact?: string; type?: string }) =>
    api.post('/branches', data),
  update: (id: number, data: any) => api.put(`/branches/${id}`, data),
  delete: (id: number) => api.delete(`/branches/${id}`),
};

// Employee API
export const employeeApi = {
  getAll: (branchId?: number) =>
    api.get('/employees', { params: { branchId } }),
  getById: (id: number) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: number, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
  getFixedDeductions: (id: number) => api.get(`/employees/${id}/fixed-deductions`),
  updateFixedDeductions: (id: number, deductions: any[]) =>
    api.put(`/employees/${id}/fixed-deductions`, { deductions }),
  getIncentiveExclusions: (id: number) => api.get(`/employees/${id}/incentive-exclusions`),
  toggleIncentiveExclusion: (id: number, incentiveType: string) =>
    api.post(`/employees/${id}/incentive-exclusions`, { incentiveType }),
};

// Payroll API
export const payrollApi = {
  getAll: (params?: { branchId?: number; startDate?: string; endDate?: string; status?: string }) =>
    api.get('/payroll', { params }),
  getById: (id: number) => api.get(`/payroll/${id}`),
  createPeriod: (data: { branchId: number; startDate: string; endDate: string; workingDays?: number }) =>
    api.post('/payroll/create-period', data),
  update: (id: number, data: any) => api.put(`/payroll/${id}`, data),
  calculate: (id: number) => api.post(`/payroll/${id}/calculate`),
  delete: (id: number) => api.delete(`/payroll/${id}`),
};

// Incentive API
export const incentiveApi = {
  // Config endpoints
  getConfig: () => api.get('/incentives/config'),
  getConfigForPosition: (position: string) => api.get(`/incentives/config/position/${position}`),
  updateConfig: (type: string, data: any) => api.put(`/incentives/config/${type}`, data),
  initConfig: () => api.post('/incentives/config/init'),
  
  // CRUD endpoints
  getByPayroll: (payrollId: number) => api.get(`/incentives/payroll/${payrollId}`),
  create: (data: any) => api.post('/incentives', data),
  bulkUpdate: (payrollId: number, incentives: any[]) =>
    api.put(`/incentives/payroll/${payrollId}/bulk`, { incentives }),
  delete: (id: number) => api.delete(`/incentives/${id}`),
  
  // Calculation endpoint
  calculate: (position: string, incentives: any[]) =>
    api.post('/incentives/calculate', { position, incentives }),

  // Get eligible employee counts for shared types in a branch
  getEligibleCounts: (branchId: number) =>
    api.get(`/incentives/eligible-counts/${branchId}`),
};

// Incentive Sheet API (Branch-level daily input grid)
export const incentiveSheetApi = {
  getSheet: (branchId: number, startDate: string, endDate: string) =>
    api.get('/incentive-sheets', { params: { branchId, startDate, endDate } }),
  saveInputs: (sheetId: number, inputs: { date: string; type: string; value: number }[]) =>
    api.put(`/incentive-sheets/${sheetId}/inputs`, { inputs }),
  distribute: (sheetId: number) =>
    api.post(`/incentive-sheets/${sheetId}/distribute`),
  getConfig: () => api.get('/incentive-sheets/config'),
};

// Deduction API
export const deductionApi = {
  getByPayroll: (payrollId: number) => api.get(`/deductions/payroll/${payrollId}`),
  create: (data: any) => api.post('/deductions', data),
  bulkUpdate: (payrollId: number, deductions: any[]) =>
    api.post('/deductions/bulk', { payrollId, deductions }),
  applyFixed: (payrollId: number) => api.post(`/deductions/apply-fixed/${payrollId}`),
  updateDivisor: (payrollId: number, divisor: number) =>
    api.put(`/deductions/divisor/${payrollId}`, { divisor }),
  delete: (id: number) => api.delete(`/deductions/${id}`),
};

// Cash Advance API
export const cashAdvanceApi = {
  getAll: (params?: { employeeId?: number; isPaid?: boolean }) =>
    api.get('/cash-advances', { params }),
  getById: (id: number) => api.get(`/cash-advances/${id}`),
  create: (data: any) => api.post('/cash-advances', data),
  update: (id: number, data: any) => api.put(`/cash-advances/${id}`, data),
  markPaid: (id: number, payrollId?: number) =>
    api.post(`/cash-advances/${id}/mark-paid`, { payrollId }),
  delete: (id: number) => api.delete(`/cash-advances/${id}`),
  getUnpaid: (employeeId: number) => api.get(`/cash-advances/employee/${employeeId}/unpaid`),
};

// Dashboard API
export const dashboardApi = {
  getStats: (branchId?: number) =>
    api.get('/dashboard/stats', { params: { branchId } }),
  getPayrollSummary: (startDate: string, endDate: string, branchId?: number) =>
    api.get('/dashboard/payroll-summary', { params: { startDate, endDate, branchId } }),
};
