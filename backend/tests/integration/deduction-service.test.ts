import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { DeductionService } from '../../src/modules/deductions/deduction.service';

const service = new DeductionService();

describe('DeductionService — INTEGRATION TESTS', () => {
  describe('getByPayroll()', () => {
    it('returns array for valid payroll', async () => {
      const deductions = await service.getByPayroll(1);
      expect(Array.isArray(deductions)).toBe(true);
    });
  });

  describe('applyFixed()', () => {
    it('throws for non-existent payroll', async () => {
      await expect(service.applyFixed(99999)).rejects.toThrow('PayrollPeriod with id 99999 not found');
    });
  });

  describe('updateDivisor()', () => {
    it('rejects divisor < 1', async () => {
      await expect(service.updateDivisor(1, 0)).rejects.toThrow('Divisor must be at least 1');
    });
  });
});
