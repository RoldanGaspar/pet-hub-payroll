import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../../src/modules/payroll/calculators/payroll.calculator';

describe('PayrollCalculator — UNIT TESTS (Phase 1A)', () => {
  const BASE = {
    salary: 35000,
    ratePerDay: 1341.85,
    ratePerHour: 167.73,
    workingDays: 15,
    totalDaysPresent: 13,
    holidays: 1.30,
    overtimeHours: 2,
    lateMinutes: 30,
    mealAllowance: 0,
    silPay: 0,
    birthdayLeave: 0,
    totalIncentives: 500,
    totalDeductions: 800,
  };

  describe('calculate()', () => {
    it('returns all 6 calculated fields', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result).toHaveProperty('basicPay');
      expect(result).toHaveProperty('holidayPay');
      expect(result).toHaveProperty('overtimePay');
      expect(result).toHaveProperty('lateDeduction');
      expect(result).toHaveProperty('grossPay');
      expect(result).toHaveProperty('netPay');
    });

    it('basicPay = ratePerDay × totalDaysPresent (rounded)', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result.basicPay).toBe(17444.05);
    });

    it('holidayPay is TRUNCATED not rounded (Pet Hub spec)', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result.holidayPay).toBe(1744.40);
    });

    it('overtimePay = ratePerHour × overtimeHours (rounded)', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result.overtimePay).toBe(335.46);
    });

    it('lateDeduction = ratePerHour × (lateMinutes / 60) (rounded)', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result.lateDeduction).toBe(83.87);
    });

    it('grossPay sums all positive components (rounded)', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result.grossPay).toBe(20023.91);
    });

    it('netPay = grossPay - totalDeductions - lateDeduction (TRUNCATED)', () => {
      const result = PayrollCalculator.calculate(BASE);
      expect(result.netPay).toBe(19140.04);
    });
  });

  describe('edge cases', () => {
    it('handles zero values gracefully', () => {
      const result = PayrollCalculator.calculate({
        ...BASE,
        totalDaysPresent: 0,
        holidays: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        totalIncentives: 0,
        totalDeductions: 0,
      });
      expect(result.basicPay).toBe(0);
      expect(result.holidayPay).toBe(0);
      expect(result.overtimePay).toBe(0);
      expect(result.lateDeduction).toBe(0);
      expect(result.grossPay).toBe(0);
      expect(result.netPay).toBe(0);
    });

    it('handles maximum overtime', () => {
      const result = PayrollCalculator.calculate({
        ...BASE,
        overtimeHours: 40,
      });
      expect(result.overtimePay).toBe(6709.20);
    });

    it('handles fractional holidays correctly', () => {
      const result = PayrollCalculator.calculate({
        ...BASE,
        holidays: 1.5,
      });
      expect(result.holidayPay).toBe(2012.77);
    });
  });
});
