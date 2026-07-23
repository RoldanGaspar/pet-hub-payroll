import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PayrollService } from '../../src/modules/payroll/payroll.service';
import { RecalculationService } from '../../src/modules/payroll/calculators/recalculation.service';
import prisma from '../../src/shared/database/prisma';

describe('PayrollService — INTEGRATION TESTS (Phase 1A)', () => {
  const service = new PayrollService();
  let createdPayrollIds: number[] = [];

  afterAll(async () => {
    for (const id of createdPayrollIds) {
      await prisma.deduction.deleteMany({ where: { payrollId: id } });
      await prisma.incentive.deleteMany({ where: { payrollId: id } });
      await prisma.payrollPeriod.deleteMany({ where: { id } });
    }
  });

  describe('getAll()', () => {
    it('returns an array of payroll periods', async () => {
      const result = await service.getAll({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters by branchId', async () => {
      const result = await service.getAll({ branchId: 1 });
      for (const p of result) {
        expect(p.employee.branchId).toBe(1);
      }
    });

    it('respects status filter', async () => {
      const result = await service.getAll({ status: 'DRAFT' });
      for (const p of result) {
        expect(p.status).toBe('DRAFT');
      }
    });
  });

  describe('getById()', () => {
    it('throws NotFoundError for non-existent payroll', async () => {
      await expect(service.getById(99999)).rejects.toThrow('PayrollPeriod with id 99999 not found');
    });
  });

  describe('createPeriod()', () => {
    it('creates payroll periods for active employees in a branch', async () => {
      const uniqueEnd = new Date(Date.now() + 86400000).toISOString();
      const uniqueStart = new Date().toISOString();

      const result = await service.createPeriod({
        branchId: 1,
        startDate: uniqueStart,
        endDate: uniqueEnd,
        workingDays: 15,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      for (const p of result) {
        createdPayrollIds.push(p.id);
        expect(p).toHaveProperty('id');
        expect(p.status).toBe('DRAFT');
        expect(p.workingDays).toBe(15);
        expect(p.deductionDivisor).toBe(2);
      }
    });
  });

  describe('updatePayroll()', () => {
    it('throws NotFoundError for non-existent payroll', async () => {
      await expect(service.updatePayroll(99999, { workingDays: 10 })).rejects.toThrow('PayrollPeriod with id 99999 not found');
    });
  });

  describe('RecalculationService', () => {
    it('recalculates without error', async () => {
      if (createdPayrollIds.length === 0) return;
      const recalc = new RecalculationService();
      await recalc.recalculate(createdPayrollIds[0]);
      // If no throw, recalculation succeeded
      const updated = await service.getById(createdPayrollIds[0]);
      expect(updated).toHaveProperty('netPay');
    });
  });
});
