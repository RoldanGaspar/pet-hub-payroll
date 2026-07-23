import { MonetaryRules } from '../../../shared/utils/monetary.utils';
import { PositionType } from '@prisma/client';

export enum IncentiveType {
  CBC = 'CBC',
  BLOOD_CHEM = 'BLOOD_CHEM',
  ULTRASOUND = 'ULTRASOUND',
  TEST_KITS = 'TEST_KITS',
  XRAY = 'XRAY',
  SURGERY = 'SURGERY',
  EMERGENCY = 'EMERGENCY',
  CONFINEMENT_VET = 'CONFINEMENT_VET',
  CONFINEMENT_ASST = 'CONFINEMENT_ASST',
  GROOMING = 'GROOMING',
  NURSING = 'NURSING',
}

export enum FormulaType {
  COUNT_MULTIPLY = 'COUNT_MULTIPLY',
  PERCENT = 'PERCENT',
}

export interface IncentiveConfigItem {
  type: IncentiveType;
  name: string;
  rate: number;
  formulaType: FormulaType;
  description: string;
  positions: PositionType[];
  sortOrder: number;
  isShared?: boolean;
  divisionPositions?: PositionType[];
}

export const DEFAULT_INCENTIVE_CONFIG: IncentiveConfigItem[] = [
  {
    type: IncentiveType.CBC, name: 'CBC (Complete Blood Count)', rate: 50,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Count × ₱50 per procedure',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN], sortOrder: 1,
  },
  {
    type: IncentiveType.BLOOD_CHEM, name: 'Blood Chemistry', rate: 100,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Count × ₱100 per procedure',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN], sortOrder: 2,
  },
  {
    type: IncentiveType.ULTRASOUND, name: 'Ultrasound', rate: 100,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Count × ₱100 per procedure',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN], sortOrder: 3,
  },
  {
    type: IncentiveType.TEST_KITS, name: 'Test Kits', rate: 50,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Count × ₱50 per test',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN], sortOrder: 4,
  },
  {
    type: IncentiveType.XRAY, name: 'X-Ray', rate: 100,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Count × ₱100 per X-ray',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN], sortOrder: 5,
  },
  {
    type: IncentiveType.SURGERY, name: 'Surgery', rate: 0.10,
    formulaType: FormulaType.PERCENT, description: 'Total Surgery Amount × 10%',
    positions: [
      PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN,
      PositionType.VETERINARY_ASSISTANT, PositionType.VETERINARY_NURSE,
      PositionType.STAFF, PositionType.GROOMER,
    ], sortOrder: 6,
  },
  {
    type: IncentiveType.EMERGENCY, name: 'Emergency', rate: 0.40,
    formulaType: FormulaType.PERCENT, description: 'Total Emergency Amount × 40%',
    positions: [
      PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN,
      PositionType.VETERINARY_ASSISTANT, PositionType.VETERINARY_NURSE,
      PositionType.STAFF, PositionType.GROOMER,
    ], sortOrder: 7,
  },
  {
    type: IncentiveType.CONFINEMENT_VET, name: 'Confinement (Vet)', rate: 55,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Total units × ₱55 ÷ all vets (Resident Vets only receive)',
    positions: [PositionType.RESIDENT_VETERINARIAN], sortOrder: 8,
    isShared: true,
    divisionPositions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
  },
  {
    type: IncentiveType.CONFINEMENT_ASST, name: 'Confinement (Assistant)', rate: 45,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Total units × ₱45 ÷ eligible staff',
    positions: [
      PositionType.VETERINARY_ASSISTANT, PositionType.GROOMER_VET_ASSISTANT,
      PositionType.VETERINARY_NURSE, PositionType.STAFF, PositionType.GROOMER,
    ], sortOrder: 9, isShared: true,
  },
  {
    type: IncentiveType.GROOMING, name: 'Grooming', rate: 75,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Total units × ₱75 ÷ eligible groomers',
    positions: [PositionType.GROOMER, PositionType.GROOMER_VET_ASSISTANT], sortOrder: 10, isShared: true,
  },
  {
    type: IncentiveType.NURSING, name: 'Nursing', rate: 80,
    formulaType: FormulaType.COUNT_MULTIPLY, description: 'Count × ₱80 per nursing case',
    positions: [
      PositionType.VETERINARY_NURSE, PositionType.VETERINARY_ASSISTANT,
      PositionType.STAFF, PositionType.GROOMER,
    ], sortOrder: 11, isShared: true,
  },
];

export interface IncentiveCalculationInput {
  type: string;
  count: number;
  inputValue: number;
  rate: number;
  formulaType: FormulaType;
  numEligible?: number;
}

export interface IncentiveCalculationResult {
  amount: number;
  formula: string;
}

export class IncentiveCalculator {
  static calculate(input: IncentiveCalculationInput): IncentiveCalculationResult {
    let amount = 0;
    let formula = '';
    const numEligible = input.numEligible && input.numEligible > 0 ? input.numEligible : 0;

    if (input.formulaType === FormulaType.COUNT_MULTIPLY) {
      const totalPay = input.count * input.rate;
      if (numEligible > 1) {
        amount = totalPay / numEligible;
        formula = `(${input.count} × ₱${input.rate.toLocaleString()}) ÷ ${numEligible} = ₱${MonetaryRules.round(amount).toLocaleString()}`;
      } else {
        amount = totalPay;
        formula = `${input.count} × ₱${input.rate.toLocaleString()} = ₱${MonetaryRules.round(amount).toLocaleString()}`;
      }
    } else if (input.formulaType === FormulaType.PERCENT) {
      amount = input.inputValue * input.rate;
      const percentDisplay = (input.rate * 100).toFixed(0);
      formula = `₱${input.inputValue.toLocaleString()} × ${percentDisplay}% = ₱${MonetaryRules.round(amount).toLocaleString()}`;
    }

    return { amount: MonetaryRules.round(amount), formula };
  }

  static isShared(type: string): boolean {
    return DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type)?.isShared === true;
  }

  static getDivisionPositions(type: string): PositionType[] {
    const config = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
    return config?.divisionPositions || config?.positions || [];
  }

  static getReceivingPositions(type: string): PositionType[] {
    const config = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
    return config?.positions || [];
  }

  static getTypesForPosition(position: PositionType): IncentiveConfigItem[] {
    return DEFAULT_INCENTIVE_CONFIG
      .filter((c) => c.positions.includes(position))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static getConfigByType(type: string): IncentiveConfigItem | undefined {
    return DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
  }

  static calculateBulk(
    position: PositionType,
    inputs: { type: string; count: number; inputValue: number }[],
    customRates?: Map<string, number>
  ) {
    const availableTypes = this.getTypesForPosition(position);
    const incentives: any[] = [];
    let totalCount = 0;
    let totalAmount = 0;

    for (const config of availableTypes) {
      const input = inputs.find((i) => i.type === config.type);
      const count = input?.count || 0;
      const inputValue = input?.inputValue || 0;
      const rate = customRates?.get(config.type) ?? config.rate;

      const result = this.calculate({
        type: config.type,
        count, inputValue, rate,
        formulaType: config.formulaType as FormulaType,
      });

      if (config.formulaType === FormulaType.COUNT_MULTIPLY) {
        totalCount += count;
      }
      totalAmount += result.amount;

      incentives.push({ type: config.type, count, inputValue, rate, amount: result.amount, formula: result.formula });
    }

    return { incentives, totalCount, totalAmount: MonetaryRules.round(totalAmount) };
  }
}

export const POSITION_DISPLAY_NAMES: Record<PositionType, string> = {
  [PositionType.RESIDENT_VETERINARIAN]: 'Resident Veterinarian',
  [PositionType.JUNIOR_VETERINARIAN]: 'Junior Veterinarian',
  [PositionType.GROOMER]: 'Groomer',
  [PositionType.GROOMER_VET_ASSISTANT]: 'Groomer / Vet Assistant',
  [PositionType.VETERINARY_ASSISTANT]: 'Veterinary Assistant',
  [PositionType.VETERINARY_NURSE]: 'Veterinary Nurse',
  [PositionType.CLINIC_SECRETARY]: 'Clinic Secretary',
  [PositionType.STAFF]: 'Staff',
};

export const INCENTIVE_DISPLAY_NAMES: Record<string, string> = {
  CBC: 'CBC', BLOOD_CHEM: 'Blood Chem', ULTRASOUND: 'Ultrasound', TEST_KITS: 'Test Kits',
  XRAY: 'X-Ray', SURGERY: 'Surgery', EMERGENCY: 'Emergency',
  CONFINEMENT_VET: 'Confinement (Vet)', CONFINEMENT_ASST: 'Confinement (Asst)',
  GROOMING: 'Grooming', NURSING: 'Nursing',
};
