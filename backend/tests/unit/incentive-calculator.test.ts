import { describe, it, expect } from 'vitest';
import { IncentiveCalculator, FormulaType } from '../../src/modules/incentives/calculators/incentive.calculator';
import { PositionType } from '@prisma/client';

describe('IncentiveCalculator — UNIT TESTS (Phase 2A)', () => {
  describe('calculate()', () => {
    it('COUNT_MULTIPLY: count × rate', () => {
      const r = IncentiveCalculator.calculate({ type: 'CBC', count: 5, inputValue: 0, rate: 50, formulaType: FormulaType.COUNT_MULTIPLY });
      expect(r.amount).toBe(250);
    });

    it('COUNT_MULTIPLY shared: divides among eligible', () => {
      const r = IncentiveCalculator.calculate({ type: 'GROOMING', count: 100, inputValue: 0, rate: 75, formulaType: FormulaType.COUNT_MULTIPLY, numEligible: 2 });
      expect(r.amount).toBe(3750);
    });

    it('PERCENT: inputValue × rate', () => {
      const r = IncentiveCalculator.calculate({ type: 'SURGERY', count: 0, inputValue: 34550, rate: 0.10, formulaType: FormulaType.PERCENT });
      expect(r.amount).toBe(3455);
    });
  });

  describe('isShared()', () => {
    it('true for CONFINEMENT_VET, CONFINEMENT_ASST, GROOMING, NURSING', () => {
      expect(IncentiveCalculator.isShared('CONFINEMENT_VET')).toBe(true);
      expect(IncentiveCalculator.isShared('CONFINEMENT_ASST')).toBe(true);
      expect(IncentiveCalculator.isShared('GROOMING')).toBe(true);
      expect(IncentiveCalculator.isShared('NURSING')).toBe(true);
    });
    it('false for CBC, SURGERY, EMERGENCY', () => {
      expect(IncentiveCalculator.isShared('CBC')).toBe(false);
      expect(IncentiveCalculator.isShared('SURGERY')).toBe(false);
      expect(IncentiveCalculator.isShared('EMERGENCY')).toBe(false);
    });
  });

  describe('getTypesForPosition()', () => {
    it('Resident Vet gets 8 types', () => {
      expect(IncentiveCalculator.getTypesForPosition(PositionType.RESIDENT_VETERINARIAN)).toHaveLength(8);
    });
    it('Junior Vet gets 7 types', () => {
      expect(IncentiveCalculator.getTypesForPosition(PositionType.JUNIOR_VETERINARIAN)).toHaveLength(7);
    });
  });

  describe('calculateBulk()', () => {
    it('returns correct totals for Resident Vet', () => {
      const r = IncentiveCalculator.calculateBulk(PositionType.RESIDENT_VETERINARIAN, [
        { type: 'CBC', count: 10, inputValue: 0 },
        { type: 'BLOOD_CHEM', count: 5, inputValue: 0 },
        { type: 'SURGERY', count: 0, inputValue: 50000 },
      ]);
      expect(r.totalAmount).toBe(6000);
      expect(r.incentives).toHaveLength(8);
    });
  });
});
