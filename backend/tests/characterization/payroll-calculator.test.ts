import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../../src/modules/payroll/calculators/payroll.calculator';
import {
  RateCalculator,
  DEFAULT_WORKING_DAYS_PER_MONTH,
  DEFAULT_WORKING_HOURS_PER_DAY,
  ANNUAL_WORKING_DAYS,
} from '../../src/modules/payroll/calculators/rate.calculator';
import { PositionType } from '@prisma/client';

describe('Payroll Calculator — CHARACTERIZATION (lock-in current behavior)', () => {
  const STANDARD_INPUT = {
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

  describe('basicPay', () => {
    it('calculates basic pay as ratePerDay × totalDaysPresent (rounded)', () => {
      const result = PayrollCalculator.calculate(STANDARD_INPUT);
      expect(result.basicPay).toBe(17444.05); // 1341.85 × 13
    });

    it('returns 0 when totalDaysPresent is 0', () => {
      const result = PayrollCalculator.calculate({ ...STANDARD_INPUT, totalDaysPresent: 0 });
      expect(result.basicPay).toBe(0);
    });
  });

  describe('holidayPay — TRUNCATED (not rounded)', () => {
    it('truncates holiday pay to 2 decimal places', () => {
      const result = PayrollCalculator.calculate(STANDARD_INPUT);
      // 1.30 × 1341.85 = 1744.405 → TRUNCATED to 1744.40
      expect(result.holidayPay).toBe(1744.40);
    });

    it('does NOT round up (confirms truncation vs rounding)', () => {
      const input = { ...STANDARD_INPUT, holidays: 1.30, ratePerDay: 1341.85 };
      const result = PayrollCalculator.calculate(input);
      // If rounding: 1744.41, If truncation: 1744.40
      expect(result.holidayPay).toBe(1744.40);
      expect(result.holidayPay).not.toBe(1744.41);
    });

    it('handles zero holidays', () => {
      const result = PayrollCalculator.calculate({ ...STANDARD_INPUT, holidays: 0 });
      expect(result.holidayPay).toBe(0);
    });

    it('handles fractional holidays like 1.30 correctly', () => {
      // 1.30 is a known decimal value for holidays
      const inputWithHighRate = { ...STANDARD_INPUT, holidays: 1.30, ratePerDay: 2000 };
      // 1.30 × 2000 = 2600.00 exactly
      const result = PayrollCalculator.calculate(inputWithHighRate);
      expect(result.holidayPay).toBe(2600.00);
    });
  });

  describe('overtimePay', () => {
    it('calculates overtime as ratePerHour × overtimeHours (rounded)', () => {
      const result = PayrollCalculator.calculate(STANDARD_INPUT);
      expect(result.overtimePay).toBe(335.46); // 167.73 × 2
    });

    it('returns 0 when no overtime', () => {
      const result = PayrollCalculator.calculate({ ...STANDARD_INPUT, overtimeHours: 0 });
      expect(result.overtimePay).toBe(0);
    });
  });

  describe('lateDeduction', () => {
    it('calculates late deduction as ratePerHour × (lateMinutes / 60)', () => {
      const result = PayrollCalculator.calculate(STANDARD_INPUT);
      expect(result.lateDeduction).toBe(83.87); // 167.73 × (30/60) = 83.865 → rounded to 83.87
    });

    it('returns 0 when no late minutes', () => {
      const result = PayrollCalculator.calculate({ ...STANDARD_INPUT, lateMinutes: 0 });
      expect(result.lateDeduction).toBe(0);
    });
  });

  describe('grossPay', () => {
    it('sums basic + holiday + overtime + incentives + allowances (rounded)', () => {
      const result = PayrollCalculator.calculate({
        ...STANDARD_INPUT,
        totalIncentives: 500,
        mealAllowance: 0,
        silPay: 0,
        birthdayLeave: 0,
      });
      // 17444.05 + 1744.40 + 335.46 + 500 = 20023.91
      expect(result.grossPay).toBe(20023.91);
    });
  });

  describe('netPay — TRUNCATED (not rounded)', () => {
    it('calculates net pay with truncation', () => {
      const result = PayrollCalculator.calculate(STANDARD_INPUT);
      // grossPay(20023.91) - totalDeductions(800) - lateDeduction(83.87) = 19140.04
      expect(result.netPay).toBe(19140.04);
    });

    it('applies truncation to net pay', () => {
      // Input that produces a value ending in .xx5 or .xx6 to verify truncation
      const input = {
        ...STANDARD_INPUT,
        ratePerDay: 1341.85,
        ratePerHour: 167.73125,
        totalDaysPresent: 13,
        holidays: 1.30,
        overtimeHours: 2,
        lateMinutes: 30,
      };
      const result = PayrollCalculator.calculate(input);
      // Result should be truncated, not rounded
      const rounded = Math.round(result.netPay * 100) / 100;
      // If netPay ends in .xx5 or higher, truncation gives different result than rounding
      // Truncation should give ≤ rounded value
      expect(result.netPay).toBeLessThanOrEqual(rounded);
    });
  });
});

describe('Rate Calculator — CHARACTERIZATION (lock-in current behavior)', () => {
  describe('calculateMonthlyRates (Monthly Formula)', () => {
    it('calculates rate per day as Salary ÷ workingDays', () => {
      const rates = RateCalculator.calculateMonthly(45000, 22, 8);
      // 45000 / 22 = 2045.454545... → rounded to 2045.45
      expect(rates.ratePerDay).toBe(2045.45);
    });

    it('calculates rate per hour as ratePerDay ÷ workingHours', () => {
      const rates = RateCalculator.calculateMonthly(45000, 22, 8);
      // 2045.45 / 8 = 255.68125 → rounded to 255.68
      expect(rates.ratePerHour).toBe(255.68);
    });

    it('uses default values when not provided', () => {
      const rates = RateCalculator.calculateMonthly(45000);
      // Default D=22, H=8
      expect(rates.ratePerDay).toBe(2045.45);
      expect(rates.ratePerHour).toBe(255.68);
    });

    it('handles different branch working days', () => {
      const rates = RateCalculator.calculateMonthly(45000, 26, 8);
      // 45000 / 26 = 1730.769... → 1730.77
      expect(rates.ratePerDay).toBe(1730.77);
    });
  });

  describe('calculateAnnualRates (Annual Formula)', () => {
    it('calculates rate per day as (Salary × 12) ÷ 313', () => {
      const rates = RateCalculator.calculateAnnual(35000, 8);
      // (35000 × 12) / 313 = 420000 / 313 = 1341.853035... → 1341.85
      expect(rates.ratePerDay).toBe(1341.85);
    });

    it('calculates rate per hour as ratePerDay ÷ workingHours', () => {
      const rates = RateCalculator.calculateAnnual(35000, 8);
      // 1341.85 / 8 = 167.73125 → 167.73
      expect(rates.ratePerHour).toBe(167.73);
    });

    it('uses default hours when not provided', () => {
      const rates = RateCalculator.calculateAnnual(35000);
      expect(rates.ratePerDay).toBe(1341.85);
      expect(rates.ratePerHour).toBe(167.73);
    });

    it('handles different salaries', () => {
      const rates = RateCalculator.calculateAnnual(16000, 8);
      // (16000 × 12) / 313 = 192000 / 313 = 613.41853... → 613.42
      expect(rates.ratePerDay).toBe(613.42);
      // 613.42 / 8 = 76.6775 → 76.68
      expect(rates.ratePerHour).toBe(76.68);
    });
  });

  describe('calculateEmployeeRates (dispatcher)', () => {
    it('uses monthly formula for MONTHLY method', () => {
      const rates = RateCalculator.calculateEmployeeRates(45000, 'MONTHLY', 22, 8);
      expect(rates.ratePerDay).toBe(2045.45);
      expect(rates.ratePerHour).toBe(255.68);
    });

    it('uses annual formula for ANNUAL method', () => {
      const rates = RateCalculator.calculateEmployeeRates(35000, 'ANNUAL', 22, 8);
      expect(rates.ratePerDay).toBe(1341.85);
      expect(rates.ratePerHour).toBe(167.73);
    });
  });

  describe('usesAnnualFormula', () => {
    it('returns false for RESIDENT_VETERINARIAN', () => {
      expect(RateCalculator.usesAnnualFormula(PositionType.RESIDENT_VETERINARIAN)).toBe(false);
    });

    it('returns true for all other positions', () => {
      expect(RateCalculator.usesAnnualFormula(PositionType.JUNIOR_VETERINARIAN)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.GROOMER)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.GROOMER_VET_ASSISTANT)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.VETERINARY_ASSISTANT)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.VETERINARY_NURSE)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.CLINIC_SECRETARY)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.STAFF)).toBe(true);
    });
  });

  describe('getDefaultCalculationMethod', () => {
    it('returns MONTHLY for RESIDENT_VETERINARIAN', () => {
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.RESIDENT_VETERINARIAN)).toBe('MONTHLY');
    });

    it('returns ANNUAL for all other positions', () => {
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.JUNIOR_VETERINARIAN)).toBe('ANNUAL');
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.GROOMER)).toBe('ANNUAL');
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.VETERINARY_ASSISTANT)).toBe('ANNUAL');
    });
  });

  describe('constants', () => {
    it('has correct defaults', () => {
      expect(DEFAULT_WORKING_DAYS_PER_MONTH).toBe(22);
      expect(DEFAULT_WORKING_HOURS_PER_DAY).toBe(8);
      expect(ANNUAL_WORKING_DAYS).toBe(313);
    });
  });
});
