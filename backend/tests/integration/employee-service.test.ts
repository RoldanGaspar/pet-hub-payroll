import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { EmployeeService } from '../../src/modules/employees/employee.service';

const service = new EmployeeService();

describe('EmployeeService — INTEGRATION TESTS', () => {
  describe('getAll()', () => {
    it('returns array of active employees', async () => {
      const employees = await service.getAll();
      expect(Array.isArray(employees)).toBe(true);
      expect(employees.length).toBeGreaterThanOrEqual(6);
    });

    it('each employee has required fields', async () => {
      const employees = await service.getAll();
      for (const e of employees) {
        expect(e).toHaveProperty('id');
        expect(e).toHaveProperty('name');
        expect(e).toHaveProperty('position');
        expect(e).toHaveProperty('salary');
        expect(e).toHaveProperty('ratePerDay');
        expect(e).toHaveProperty('ratePerHour');
        expect(e).toHaveProperty('branch');
      }
    });

    it('filters by branchId', async () => {
      const employees = await service.getAll(1);
      for (const e of employees) {
        expect(e.branchId).toBe(1);
      }
    });
  });

  describe('getById()', () => {
    it('throws NotFoundError for non-existent', async () => {
      await expect(service.getById(99999)).rejects.toThrow('Employee with id 99999 not found');
    });
  });

  describe('getFixedDeductions()', () => {
    it('returns deductions for valid employee', async () => {
      const result = await service.getFixedDeductions(1);
      expect(result).toHaveProperty('fixedDeductions');
      expect(Array.isArray(result.fixedDeductions)).toBe(true);
    });

    it('throws for non-existent employee', async () => {
      await expect(service.getFixedDeductions(99999)).rejects.toThrow('Employee with id 99999 not found');
    });
  });

  describe('getFormulaInfo()', () => {
    it('returns MONTHLY for Resident Vet', async () => {
      const info = await service.getFormulaInfo('RESIDENT_VETERINARIAN' as any);
      expect(info.usesAnnualFormula).toBe(false);
    });

    it('returns ANNUAL for Junior Vet', async () => {
      const info = await service.getFormulaInfo('JUNIOR_VETERINARIAN' as any);
      expect(info.usesAnnualFormula).toBe(true);
    });
  });

  describe('getExclusions()', () => {
    it('returns array for valid employee', async () => {
      const exclusions = await service.getExclusions(1);
      expect(Array.isArray(exclusions)).toBe(true);
    });
  });

  describe('toggleExclusion()', () => {
    it('toggles exclusion for an employee', async () => {
      const result = await service.toggleExclusion(1, 'GROOMING');
      expect(result).toHaveProperty('excluded');
      expect(result).toHaveProperty('message');
    });
  });
});
