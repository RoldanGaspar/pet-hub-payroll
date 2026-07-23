import { describe, it, expect } from 'vitest';
import { createPeriodSchema, updatePayrollSchema } from '../../src/modules/payroll/payroll.schema';

describe('Payroll Schemas — VALIDATION TESTS (Phase 1A)', () => {
  describe('createPeriodSchema', () => {
    it('accepts valid input', () => {
      const result = createPeriodSchema.safeParse({
        branchId: 1,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-15T00:00:00.000Z',
        workingDays: 15,
      });
      expect(result.success).toBe(true);
    });

    it('accepts input without optional workingDays', () => {
      const result = createPeriodSchema.safeParse({
        branchId: 1,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-15T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = createPeriodSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects negative branchId', () => {
      const result = createPeriodSchema.safeParse({
        branchId: -1,
        startDate: '2026-01-01',
        endDate: '2026-01-15',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer branchId', () => {
      const result = createPeriodSchema.safeParse({
        branchId: 1.5,
        startDate: '2026-01-01',
        endDate: '2026-01-15',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePayrollSchema', () => {
    it('accepts empty update (all fields optional)', () => {
      const result = updatePayrollSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid status values', () => {
      for (const status of ['DRAFT', 'PENDING', 'APPROVED', 'PAID']) {
        const result = updatePayrollSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const result = updatePayrollSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('rejects negative holidays', () => {
      const result = updatePayrollSchema.safeParse({ holidays: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts zero values', () => {
      const result = updatePayrollSchema.safeParse({
        workingDays: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        mealAllowance: 0,
      });
      expect(result.success).toBe(true);
    });
  });
});
