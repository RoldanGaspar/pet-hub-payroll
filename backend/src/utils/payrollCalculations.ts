import { PositionType } from '@prisma/client';

export interface PayrollCalculationInput {
  salary: number;
  ratePerDay: number;
  ratePerHour: number;
  workingDays: number;
  totalDaysPresent: number;
  holidays: number; // Can be decimal (e.g., 1.30)
  overtimeHours: number;
  lateMinutes: number;
  mealAllowance: number;
  silPay: number;
  birthdayLeave: number;
  totalIncentives: number;
  totalDeductions: number;
}

export interface PayrollCalculationResult {
  basicPay: number;
  holidayPay: number;
  overtimePay: number;
  lateDeduction: number;
  grossPay: number;
  netPay: number;
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  // Basic Pay = Rate/Day x Total Days Present
  const basicPay = input.ratePerDay * input.totalDaysPresent;

  // Holiday Pay = No. of Holidays × Rate/Day
  const holidayPay = input.holidays * input.ratePerDay;

  // Overtime Pay = Rate/Hour × OT Hours
  const overtimePay = input.ratePerHour * input.overtimeHours;

  // Late Deduction = Rate/Hour x (Late Minutes / 60)
  const lateDeduction = input.ratePerHour * (input.lateMinutes / 60);

  // Gross Pay = Basic Pay + Holiday Pay + Overtime Pay + Total Incentives + Meal Allowance + SIL + Birthday Leave
  const grossPay =
    basicPay +
    holidayPay +
    overtimePay +
    input.totalIncentives +
    input.mealAllowance +
    input.silPay +
    input.birthdayLeave;

  // Net Pay = Gross Pay - Total Deductions - Late Deduction
  const netPay = grossPay - input.totalDeductions - lateDeduction;

  return {
    basicPay: roundToTwo(basicPay),
    holidayPay: roundToTwo(holidayPay),
    overtimePay: roundToTwo(overtimePay),
    lateDeduction: roundToTwo(lateDeduction),
    grossPay: roundToTwo(grossPay),
    netPay: roundToTwo(netPay),
  };
}

// Default values for rate calculation
export const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
export const DEFAULT_WORKING_HOURS_PER_DAY = 8;
export const ANNUAL_WORKING_DAYS = 313; // Used for annual formula

// Check if a position uses the annual formula
// Only RESIDENT_VETERINARIAN uses monthly formula (branch D/H)
// All other positions use annual formula: (Salary × 12) ÷ 313
export function usesAnnualFormula(position: PositionType): boolean {
  return position !== PositionType.RESIDENT_VETERINARIAN;
}

// Calculate rates using MONTHLY formula (for Resident Veterinarians)
// Rate/Day = Salary ÷ D (branch working days)
// Rate/Hour = Rate/Day ÷ H (branch working hours)
export function calculateMonthlyRates(
  monthlySalary: number,
  workingDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH,
  workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
): { ratePerDay: number; ratePerHour: number } {
  const ratePerDay = Math.round((monthlySalary / workingDaysPerMonth) * 100) / 100;
  const ratePerHour = Math.round((ratePerDay / workingHoursPerDay) * 100) / 100;
  return { ratePerDay, ratePerHour };
}

// Calculate rates using ANNUAL formula (for all positions except Resident Vet)
// Rate/Day = (Salary × 12) ÷ 313
// Rate/Hour = Rate/Day ÷ 8
export function calculateAnnualRates(
  monthlySalary: number
): { ratePerDay: number; ratePerHour: number } {
  const annualSalary = monthlySalary * 12;
  const ratePerDay = Math.round((annualSalary / ANNUAL_WORKING_DAYS) * 100) / 100;
  const ratePerHour = Math.round((ratePerDay / 8) * 100) / 100;
  return { ratePerDay, ratePerHour };
}

export function calculateRatePerDay(
  monthlySalary: number,
  workingDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH
): number {
  // Rate per day = Monthly Salary / D (working days per month)
  // Formula: S ÷ D
  return Math.round((monthlySalary / workingDaysPerMonth) * 1000000) / 1000000;
}

export function calculateRatePerHour(
  ratePerDay: number,
  workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
): number {
  // Rate per hour = Rate per Day / H (working hours per day)
  // Formula: (S ÷ D) ÷ H = S ÷ D ÷ H
  return Math.round((ratePerDay / workingHoursPerDay) * 1000000) / 1000000;
}

// Calculate employee rates based on position
// - Resident Veterinarian: Monthly formula using branch D/H settings
// - All others: Annual formula (Salary × 12 ÷ 313)
export function calculateEmployeeRates(
  monthlySalary: number,
  position: PositionType,
  workingDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH,
  workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
): { ratePerDay: number; ratePerHour: number } {
  if (usesAnnualFormula(position)) {
    return calculateAnnualRates(monthlySalary);
  } else {
    return calculateMonthlyRates(monthlySalary, workingDaysPerMonth, workingHoursPerDay);
  }
}

// Get the formula description for a position (for UI display)
export function getRateFormulaDescription(position: PositionType): string {
  if (usesAnnualFormula(position)) {
    return 'Annual: (Salary × 12) ÷ 313';
  } else {
    return 'Monthly: Salary ÷ D (branch days)';
  }
}

// Helper function to round to 2 decimal places
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

// ============== INCENTIVE SYSTEM ==============

// Incentive type definitions
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

// Formula types for incentive calculations
export enum FormulaType {
  COUNT_MULTIPLY = 'COUNT_MULTIPLY', // count * rate (e.g., 5 CBC x 50 = 250)
  PERCENT = 'PERCENT', // inputValue * rate (e.g., 34550 x 10% = 3455)
}

// Incentive config interface
interface IncentiveConfigItem {
  type: IncentiveType;
  name: string;
  rate: number;
  formulaType: FormulaType;
  description: string;
  positions: PositionType[]; // Who RECEIVES this incentive
  sortOrder: number;
  isShared?: boolean; // If true, total is divided among eligible employees
  divisionPositions?: PositionType[]; // Who is counted for division (defaults to positions if not set)
}

// Default incentive rates configuration
export const DEFAULT_INCENTIVE_CONFIG: IncentiveConfigItem[] = [
  {
    type: IncentiveType.CBC,
    name: 'CBC (Complete Blood Count)',
    rate: 50,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Count × ₱50 per procedure',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
    ],
    sortOrder: 1,
  },
  {
    type: IncentiveType.BLOOD_CHEM,
    name: 'Blood Chemistry',
    rate: 100,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Count × ₱100 per procedure',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
    ],
    sortOrder: 2,
  },
  {
    type: IncentiveType.ULTRASOUND,
    name: 'Ultrasound',
    rate: 100,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Count × ₱100 per procedure',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
    ],
    sortOrder: 3,
  },
  {
    type: IncentiveType.TEST_KITS,
    name: 'Test Kits',
    rate: 50,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Count × ₱50 per test',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
    ],
    sortOrder: 4,
  },
  {
    type: IncentiveType.XRAY,
    name: 'X-Ray',
    rate: 100,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Count × ₱100 per X-ray',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
    ],
    sortOrder: 5,
  },
  {
    type: IncentiveType.SURGERY,
    name: 'Surgery',
    rate: 0.10, // 10%
    formulaType: FormulaType.PERCENT,
    description: 'Total Surgery Amount × 10%',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.STAFF,
      PositionType.GROOMER,
    ],
    sortOrder: 6,
  },
  {
    type: IncentiveType.EMERGENCY,
    name: 'Emergency',
    rate: 0.40, // 40%
    formulaType: FormulaType.PERCENT,
    description: 'Total Emergency Amount × 40%',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.STAFF,
      PositionType.GROOMER,
    ],
    sortOrder: 7,
  },
  {
    type: IncentiveType.CONFINEMENT_VET,
    name: 'Confinement (Vet)',
    rate: 55,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Total units × ₱55 ÷ all vets (Resident Vets only receive)',
    positions: [
      PositionType.RESIDENT_VETERINARIAN, // Only Resident Vets RECEIVE
    ],
    sortOrder: 8,
    isShared: true,
    divisionPositions: [ // ALL vets counted for division
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
    ],
  },
  {
    type: IncentiveType.CONFINEMENT_ASST,
    name: 'Confinement (Assistant)',
    rate: 45,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Total units × ₱45 ÷ eligible staff',
    positions: [
      PositionType.VETERINARY_ASSISTANT,
      PositionType.GROOMER_VET_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.STAFF,
      PositionType.GROOMER,
    ],
    sortOrder: 9,
    isShared: true,
  },
  {
    type: IncentiveType.GROOMING,
    name: 'Grooming',
    rate: 75,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Total units × ₱75 ÷ eligible groomers',
    positions: [
      PositionType.GROOMER,
      PositionType.GROOMER_VET_ASSISTANT,
    ],
    sortOrder: 10,
    isShared: true,
  },
  {
    type: IncentiveType.NURSING,
    name: 'Nursing',
    rate: 80,
    formulaType: FormulaType.COUNT_MULTIPLY,
    description: 'Count × ₱80 per nursing case',
    positions: [
      PositionType.VETERINARY_NURSE,
      PositionType.VETERINARY_ASSISTANT,
      PositionType.STAFF,
      PositionType.GROOMER,
    ],
    sortOrder: 11,
    isShared: true,
  },
];

// Get incentive types available for a specific position
export function getIncentiveTypesForPosition(position: PositionType): IncentiveConfigItem[] {
  return DEFAULT_INCENTIVE_CONFIG.filter((config) =>
    config.positions.includes(position)
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Calculate a single incentive
export interface IncentiveCalculationInput {
  type: string;
  count: number; // For COUNT_MULTIPLY formula
  inputValue: number; // For PERCENT formula (e.g., total surgery amount)
  rate: number;
  formulaType: FormulaType;
  numEligible?: number; // For shared types: divide total among eligible employees
}

export interface IncentiveCalculationResult {
  amount: number;
  formula: string; // Human-readable formula string
}

export function calculateIncentive(input: IncentiveCalculationInput): IncentiveCalculationResult {
  let amount = 0;
  let formula = '';
  const numEligible = input.numEligible && input.numEligible > 0 ? input.numEligible : 0;

  if (input.formulaType === FormulaType.COUNT_MULTIPLY) {
    const totalPay = input.count * input.rate;
    if (numEligible > 1) {
      // Shared type: divide among eligible employees
      amount = totalPay / numEligible;
      formula = `(${input.count} × ₱${input.rate.toLocaleString()}) ÷ ${numEligible} = ₱${roundToTwo(amount).toLocaleString()}`;
    } else {
      amount = totalPay;
      formula = `${input.count} × ₱${input.rate.toLocaleString()} = ₱${roundToTwo(amount).toLocaleString()}`;
    }
  } else if (input.formulaType === FormulaType.PERCENT) {
    amount = input.inputValue * input.rate;
    const percentDisplay = (input.rate * 100).toFixed(0);
    formula = `₱${input.inputValue.toLocaleString()} × ${percentDisplay}% = ₱${roundToTwo(amount).toLocaleString()}`;
  }

  return {
    amount: roundToTwo(amount),
    formula,
  };
}

// Check if an incentive type is shared (divided among eligible employees)
export function isSharedIncentiveType(type: string): boolean {
  const config = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
  return config?.isShared === true;
}

// Get the positions counted for DIVISION of a shared incentive type
// (may include more positions than those who actually RECEIVE the incentive)
export function getDivisionPositionsForType(type: string): PositionType[] {
  const config = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
  // Use divisionPositions if set, otherwise fall back to positions (who receives)
  return config?.divisionPositions || config?.positions || [];
}

// Get the positions who RECEIVE a shared incentive type
export function getReceivingPositionsForType(type: string): PositionType[] {
  const config = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
  return config?.positions || [];
}

// Calculate all incentives for an employee
export interface BulkIncentiveInput {
  type: string;
  count: number;
  inputValue: number;
}

export interface BulkIncentiveResult {
  type: string;
  count: number;
  inputValue: number;
  rate: number;
  amount: number;
  formula: string;
}

export function calculateBulkIncentives(
  position: PositionType,
  inputs: BulkIncentiveInput[],
  customRates?: Map<string, number>
): { incentives: BulkIncentiveResult[]; totalCount: number; totalAmount: number } {
  const availableTypes = getIncentiveTypesForPosition(position);
  const incentives: BulkIncentiveResult[] = [];
  let totalCount = 0;
  let totalAmount = 0;

  for (const config of availableTypes) {
    const input = inputs.find((i) => i.type === config.type);
    const count = input?.count || 0;
    const inputValue = input?.inputValue || 0;
    const rate = customRates?.get(config.type) ?? config.rate;

    const result = calculateIncentive({
      type: config.type,
      count,
      inputValue,
      rate,
      formulaType: config.formulaType as FormulaType,
    });

    // Only count procedures for COUNT_MULTIPLY types
    if (config.formulaType === FormulaType.COUNT_MULTIPLY) {
      totalCount += count;
    }

    totalAmount += result.amount;

    incentives.push({
      type: config.type,
      count,
      inputValue,
      rate,
      amount: result.amount,
      formula: result.formula,
    });
  }

  return {
    incentives,
    totalCount,
    totalAmount: roundToTwo(totalAmount),
  };
}

// Position display names
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

// Incentive type display names
export const INCENTIVE_DISPLAY_NAMES: Record<string, string> = {
  [IncentiveType.CBC]: 'CBC',
  [IncentiveType.BLOOD_CHEM]: 'Blood Chem',
  [IncentiveType.ULTRASOUND]: 'Ultrasound',
  [IncentiveType.TEST_KITS]: 'Test Kits',
  [IncentiveType.XRAY]: 'X-Ray',
  [IncentiveType.SURGERY]: 'Surgery',
  [IncentiveType.EMERGENCY]: 'Emergency',
  [IncentiveType.CONFINEMENT_VET]: 'Confinement (Vet)',
  [IncentiveType.CONFINEMENT_ASST]: 'Confinement (Asst)',
  [IncentiveType.GROOMING]: 'Grooming',
  [IncentiveType.NURSING]: 'Nursing',
};
