import { describe, it, expect } from 'vitest';
import {
  calculateIncentive,
  calculateBulkIncentives,
  getIncentiveTypesForPosition,
  isSharedIncentiveType,
  getDivisionPositionsForType,
  getReceivingPositionsForType,
  DEFAULT_INCENTIVE_CONFIG,
  IncentiveType,
  FormulaType,
} from '../../src/utils/payrollCalculations';
import { PositionType } from '@prisma/client';

describe('Incentive Calculator — CHARACTERIZATION (lock-in current behavior)', () => {
  describe('calculateIncentive — COUNT_MULTIPLY formula', () => {
    it('calculates count × rate for non-shared types', () => {
      const result = calculateIncentive({
        type: 'CBC',
        count: 5,
        inputValue: 0,
        rate: 50,
        formulaType: FormulaType.COUNT_MULTIPLY,
      });
      expect(result.amount).toBe(250);
      expect(result.formula).toBe('5 × ₱50 = ₱250');
    });

    it('divides among eligible employees for shared types', () => {
      const result = calculateIncentive({
        type: 'GROOMING',
        count: 100,
        inputValue: 0,
        rate: 75,
        formulaType: FormulaType.COUNT_MULTIPLY,
        numEligible: 2,
      });
      // (100 × 75) / 2 = 3750
      expect(result.amount).toBe(3750);
      expect(result.formula).toContain('÷ 2');
    });

    it('does not divide when numEligible is 1 or less', () => {
      const result = calculateIncentive({
        type: 'GROOMING',
        count: 100,
        inputValue: 0,
        rate: 75,
        formulaType: FormulaType.COUNT_MULTIPLY,
        numEligible: 0,
      });
      expect(result.amount).toBe(7500);
    });

    it('rounds amount to 2 decimal places', () => {
      const result = calculateIncentive({
        type: 'CBC',
        count: 3,
        inputValue: 0,
        rate: 50.5,
        formulaType: FormulaType.COUNT_MULTIPLY,
      });
      // 3 × 50.5 = 151.5 → 151.5
      expect(result.amount).toBe(151.5);
    });
  });

  describe('calculateIncentive — PERCENT formula', () => {
    it('calculates inputValue × rate for percentage types', () => {
      const result = calculateIncentive({
        type: 'SURGERY',
        count: 0,
        inputValue: 34550,
        rate: 0.10,
        formulaType: FormulaType.PERCENT,
      });
      // 34550 × 0.10 = 3455.00
      expect(result.amount).toBe(3455);
      expect(result.formula).toContain('10%');
    });

    it('handles 40% emergency rate', () => {
      const result = calculateIncentive({
        type: 'EMERGENCY',
        count: 0,
        inputValue: 10000,
        rate: 0.40,
        formulaType: FormulaType.PERCENT,
      });
      expect(result.amount).toBe(4000);
      expect(result.formula).toContain('40%');
    });
  });

  describe('isSharedIncentiveType', () => {
    it('returns true for CONFINEMENT_VET', () => {
      expect(isSharedIncentiveType('CONFINEMENT_VET')).toBe(true);
    });

    it('returns true for CONFINEMENT_ASST', () => {
      expect(isSharedIncentiveType('CONFINEMENT_ASST')).toBe(true);
    });

    it('returns true for GROOMING', () => {
      expect(isSharedIncentiveType('GROOMING')).toBe(true);
    });

    it('returns true for NURSING', () => {
      expect(isSharedIncentiveType('NURSING')).toBe(true);
    });

    it('returns false for non-shared types', () => {
      expect(isSharedIncentiveType('CBC')).toBe(false);
      expect(isSharedIncentiveType('BLOOD_CHEM')).toBe(false);
      expect(isSharedIncentiveType('ULTRASOUND')).toBe(false);
      expect(isSharedIncentiveType('TEST_KITS')).toBe(false);
      expect(isSharedIncentiveType('XRAY')).toBe(false);
      expect(isSharedIncentiveType('SURGERY')).toBe(false);
      expect(isSharedIncentiveType('EMERGENCY')).toBe(false);
    });
  });
});

describe('Incentive Config — CHARACTERIZATION (lock-in current behavior)', () => {
  describe('DEFAULT_INCENTIVE_CONFIG', () => {
    it('has exactly 11 incentive types', () => {
      expect(DEFAULT_INCENTIVE_CONFIG).toHaveLength(11);
    });

    it('lists all expected types in correct order', () => {
      const types = DEFAULT_INCENTIVE_CONFIG.map((c) => c.type);
      expect(types).toEqual([
        'CBC',
        'BLOOD_CHEM',
        'ULTRASOUND',
        'TEST_KITS',
        'XRAY',
        'SURGERY',
        'EMERGENCY',
        'CONFINEMENT_VET',
        'CONFINEMENT_ASST',
        'GROOMING',
        'NURSING',
      ]);
    });

    it('has correct rates for COUNT_MULTIPLY types', () => {
      const getRate = (type: string) =>
        DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type)?.rate;

      expect(getRate('CBC')).toBe(50);
      expect(getRate('BLOOD_CHEM')).toBe(100);
      expect(getRate('ULTRASOUND')).toBe(100);
      expect(getRate('TEST_KITS')).toBe(50);
      expect(getRate('XRAY')).toBe(100);
      expect(getRate('CONFINEMENT_VET')).toBe(55);
      expect(getRate('CONFINEMENT_ASST')).toBe(45);
      expect(getRate('GROOMING')).toBe(75);
      expect(getRate('NURSING')).toBe(80);
    });

    it('has correct rates for PERCENT types', () => {
      const getRate = (type: string) =>
        DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type)?.rate;

      expect(getRate('SURGERY')).toBe(0.10);
      expect(getRate('EMERGENCY')).toBe(0.40);
    });

    it('has correct formulaTypes', () => {
      const getFormulaType = (type: string) =>
        DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type)?.formulaType;

      expect(getFormulaType('CBC')).toBe('COUNT_MULTIPLY');
      expect(getFormulaType('SURGERY')).toBe('PERCENT');
      expect(getFormulaType('EMERGENCY')).toBe('PERCENT');
      expect(getFormulaType('CONFINEMENT_VET')).toBe('COUNT_MULTIPLY');
    });

    it('marks correct types as shared', () => {
      const isShared = (type: string) =>
        DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type)?.isShared;

      expect(isShared('CONFINEMENT_VET')).toBe(true);
      expect(isShared('CONFINEMENT_ASST')).toBe(true);
      expect(isShared('GROOMING')).toBe(true);
      expect(isShared('NURSING')).toBe(true);

      expect(isShared('CBC')).toBeUndefined();
      expect(isShared('SURGERY')).toBeUndefined();
      expect(isShared('EMERGENCY')).toBeUndefined();
    });
  });

  describe('getIncentiveTypesForPosition', () => {
    it('returns 8 types for RESIDENT_VETERINARIAN (vets do not get all 11)', () => {
      // Vets get: CBC, BLOOD_CHEM, ULTRASOUND, TEST_KITS, XRAY, SURGERY, EMERGENCY, CONFINEMENT_VET
      // Vets do NOT get: CONFINEMENT_ASST, GROOMING, NURSING
      const types = getIncentiveTypesForPosition(PositionType.RESIDENT_VETERINARIAN);
      expect(types).toHaveLength(8);
    });

    it('returns 7 types for JUNIOR_VETERINARIAN (no CONFINEMENT_VET)', () => {
      // Junior vets get all the same as Resident except CONFINEMENT_VET is shared and only Resident Vets receive it
      const types = getIncentiveTypesForPosition(PositionType.JUNIOR_VETERINARIAN);
      expect(types).toHaveLength(7);
    });

    it('returns subset for GROOMER (5 types)', () => {
      const types = getIncentiveTypesForPosition(PositionType.GROOMER);
      const typeNames = types.map((t) => t.type);
      expect(typeNames).toContain('SURGERY');
      expect(typeNames).toContain('EMERGENCY');
      expect(typeNames).toContain('CONFINEMENT_ASST');
      expect(typeNames).toContain('GROOMING');
      expect(typeNames).toContain('NURSING');
    });

    it('returns sorted by sortOrder', () => {
      const types = getIncentiveTypesForPosition(PositionType.RESIDENT_VETERINARIAN);
      for (let i = 1; i < types.length; i++) {
        expect(types[i].sortOrder).toBeGreaterThanOrEqual(types[i - 1].sortOrder);
      }
    });
  });
});

describe('Bulk Incentive Calculation — CHARACTERIZATION', () => {
  it('calculates totals for a vet with all incentives', () => {
    const inputs = [
      { type: 'CBC', count: 10, inputValue: 0 },
      { type: 'BLOOD_CHEM', count: 5, inputValue: 0 },
      { type: 'SURGERY', count: 0, inputValue: 50000 },
    ];

    const result = calculateBulkIncentives(
      PositionType.RESIDENT_VETERINARIAN,
      inputs
    );

    // CBC: 10 × 50 = 500
    // Blood Chem: 5 × 100 = 500
    // Surgery: 50000 × 0.10 = 5000
    // Plus zero-count types (only those available to the position)
    expect(result.totalAmount).toBe(6000);
    // Resident Vet gets 8 incentive types (not all 11)
    expect(result.incentives).toHaveLength(8);
  });
});
