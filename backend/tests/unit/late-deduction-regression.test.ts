import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../../src/modules/payroll/calculators/payroll.calculator';

describe('Late Deduction Bug — REGRESSION TEST (Phase 1B)', () => {
  const INPUT = {
    salary: 35000,
    ratePerDay: 1341.85,
    ratePerHour: 167.73,
    workingDays: 15,
    totalDaysPresent: 13,
    holidays: 0,
    overtimeHours: 0,
    lateMinutes: 0,
    mealAllowance: 0,
    silPay: 0,
    birthdayLeave: 0,
    totalIncentives: 500,
    totalDeductions: 800,
  };

  describe('when lateMinutes = 0', () => {
    it('netPay = grossPay - totalDeductions (no late deduction)', () => {
      const result = PayrollCalculator.calculate(INPUT);
      // basic: 1341.85*13=17444.05, gross: 17444.05+500=17944.05
      // net: 17944.05-800 = 17144.05
      expect(result.grossPay).toBe(17944.05);
      expect(result.lateDeduction).toBe(0);
      expect(result.netPay).toBe(17144.05);
    });
  });

  describe('when lateMinutes = 120 (2 hours late)', () => {
    it('lateDeduction is calculated but NOT added to totalDeductions', () => {
      const withLate = PayrollCalculator.calculate({
        ...INPUT,
        lateMinutes: 120,
      });

      // lateDeduction = 167.73 * (120/60) = 335.46
      expect(withLate.lateDeduction).toBe(335.46);

      // grossPay same: 17944.05
      expect(withLate.grossPay).toBe(17944.05);

      // netPay = grossPay - totalDeductions - lateDeduction
      // 17944.05 - 800 - 335.46 = 16808.59 → truncated
      expect(withLate.netPay).toBe(16808.59);
    });
  });

  describe('spec: totalDeductions should NOT include lateDeduction', () => {
    it('the calculator itself does not modify totalDeductions', () => {
      // The calculator receives totalDeductions as input and uses it in netPay formula.
      // It should NOT add lateDeduction to the totalDeductions value.
      const result = PayrollCalculator.calculate({
        ...INPUT,
        lateMinutes: 120,
      });
      // The calculator doesn't return totalDeductions — 
      // but the SERVICE that calls it stores totalDeductions in DB.
      // This test proves the calculator's subtraction is correct.
      // The SERVICE must store: totalDeductions (from line items) WITHOUT adding lateDeduction.
      expect(result.lateDeduction).toBe(335.46);
      expect(result.netPay).toBe(16808.59);
    });
  });
});
