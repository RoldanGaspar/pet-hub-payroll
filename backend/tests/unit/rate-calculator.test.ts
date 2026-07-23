import { describe, it, expect } from 'vitest';
import { RateCalculator, DEFAULT_WORKING_DAYS_PER_MONTH, DEFAULT_WORKING_HOURS_PER_DAY, ANNUAL_WORKING_DAYS } from '../../src/modules/payroll/calculators/rate.calculator';
import { PositionType } from '@prisma/client';

describe('RateCalculator — UNIT TESTS (Phase 1A)', () => {
  describe('calculateMonthly()', () => {
    it('ratePerDay = salary / workingDays (rounded)', () => {
      const rates = RateCalculator.calculateMonthly(45000, 22, 8);
      expect(rates.ratePerDay).toBe(2045.45);
    });

    it('ratePerHour = ratePerDay / workingHours (rounded)', () => {
      const rates = RateCalculator.calculateMonthly(45000, 22, 8);
      expect(rates.ratePerHour).toBe(255.68);
    });

    it('uses defaults D=22 H=8 when not provided', () => {
      const rates = RateCalculator.calculateMonthly(45000);
      expect(rates.ratePerDay).toBe(2045.45);
      expect(rates.ratePerHour).toBe(255.68);
    });

    it('adapts to different branch working days', () => {
      const rates = RateCalculator.calculateMonthly(45000, 26, 8);
      expect(rates.ratePerDay).toBe(1730.77);
    });

    it('adapts to different branch working hours', () => {
      const rates = RateCalculator.calculateMonthly(45000, 22, 10);
      expect(rates.ratePerHour).toBe(204.55);
    });
  });

  describe('calculateAnnual()', () => {
    it('ratePerDay = (salary × 12) / 313 (rounded)', () => {
      const rates = RateCalculator.calculateAnnual(35000, 8);
      expect(rates.ratePerDay).toBe(1341.85);
    });

    it('ratePerHour = ratePerDay / 8 (rounded)', () => {
      const rates = RateCalculator.calculateAnnual(35000, 8);
      expect(rates.ratePerHour).toBe(167.73);
    });

    it('works for minimum wage', () => {
      const rates = RateCalculator.calculateAnnual(14300, 8);
      expect(rates.ratePerDay).toBe(548.24);
      expect(rates.ratePerHour).toBe(68.53);
    });

    it('works for high salary', () => {
      const rates = RateCalculator.calculateAnnual(60000, 8);
      expect(rates.ratePerDay).toBe(2300.32);
      expect(rates.ratePerHour).toBe(287.54);
    });
  });

  describe('calculateEmployeeRates()', () => {
    it('routes to monthly for MONTHLY method', () => {
      const rates = RateCalculator.calculateEmployeeRates(45000, 'MONTHLY', 22, 8);
      expect(rates.ratePerDay).toBe(2045.45);
      expect(rates.ratePerHour).toBe(255.68);
    });

    it('routes to annual for ANNUAL method', () => {
      const rates = RateCalculator.calculateEmployeeRates(35000, 'ANNUAL', 22, 8);
      expect(rates.ratePerDay).toBe(1341.85);
      expect(rates.ratePerHour).toBe(167.73);
    });
  });

  describe('getDefaultCalculationMethod()', () => {
    it('returns MONTHLY for RESIDENT_VETERINARIAN', () => {
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.RESIDENT_VETERINARIAN)).toBe('MONTHLY');
    });

    it('returns ANNUAL for JUNIOR_VETERINARIAN', () => {
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.JUNIOR_VETERINARIAN)).toBe('ANNUAL');
    });

    it('returns ANNUAL for GROOMER', () => {
      expect(RateCalculator.getDefaultCalculationMethod(PositionType.GROOMER)).toBe('ANNUAL');
    });
  });

  describe('usesAnnualFormula()', () => {
    it('returns false only for RESIDENT_VETERINARIAN', () => {
      expect(RateCalculator.usesAnnualFormula(PositionType.RESIDENT_VETERINARIAN)).toBe(false);
    });

    it('returns true for all other positions', () => {
      expect(RateCalculator.usesAnnualFormula(PositionType.JUNIOR_VETERINARIAN)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.GROOMER)).toBe(true);
      expect(RateCalculator.usesAnnualFormula(PositionType.STAFF)).toBe(true);
    });
  });

  describe('constants', () => {
    it('DEFAULT_WORKING_DAYS_PER_MONTH is 22', () => {
      expect(DEFAULT_WORKING_DAYS_PER_MONTH).toBe(22);
    });

    it('DEFAULT_WORKING_HOURS_PER_DAY is 8', () => {
      expect(DEFAULT_WORKING_HOURS_PER_DAY).toBe(8);
    });

    it('ANNUAL_WORKING_DAYS is 313', () => {
      expect(ANNUAL_WORKING_DAYS).toBe(313);
    });
  });
});
