export type UserRole = 'ADMIN' | 'BRANCH_MANAGER' | 'ACCOUNTING';
export type PayrollStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID';
export type BranchType = 'VETERINARY_CLINIC' | 'VETERINARY_HOSPITAL' | 'TRADING';
export type PositionType =
  | 'RESIDENT_VETERINARIAN'
  | 'JUNIOR_VETERINARIAN'
  | 'GROOMER'
  | 'GROOMER_VET_ASSISTANT'
  | 'VETERINARY_ASSISTANT'
  | 'VETERINARY_NURSE'
  | 'CLINIC_SECRETARY'
  | 'STAFF';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  branch?: Branch;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  contact?: string;
  type: BranchType;
  isActive: boolean;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  employees?: Employee[];
  _count?: {
    employees: number;
  };
}

export interface Employee {
  id: number;
  branchId: number;
  branch?: Branch;
  name: string;
  position: PositionType;
  salary: number;
  ratePerDay: number;
  ratePerHour: number;
  address?: string;
  sssNo?: string;
  tinNo?: string;
  philhealthNo?: string;
  pagibigNo?: string;
  hiredOn?: string;
  isActive: boolean;
  fixedDeductions?: FixedDeduction[];
  cashAdvances?: CashAdvance[];
  payrollPeriods?: PayrollPeriod[];
}

export interface PayrollPeriod {
  id: number;
  employeeId: number;
  employee?: Employee;
  startDate: string;
  endDate: string;
  workingDays: number;
  dayOff: number;
  absences: number;
  totalDaysPresent: number;
  holidays: number; // Decimal - No. of Holidays (e.g., 1.30)
  deductionDivisor: number; // Divisor for fixed deductions (default 2 = semi-monthly)
  overtimeHours: number;
  lateMinutes: number;
  mealAllowance: number;
  silPay: number;
  birthdayLeave: number;
  basicPay: number;
  holidayPay: number;
  overtimePay: number;
  totalIncentives: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  incentives?: Incentive[];
  deductions?: Deduction[];
}

export interface Incentive {
  id: number;
  payrollId: number;
  type: string;
  count: number;
  inputValue: number;
  rate: number;
  amount: number;
  formula?: string;
  dateEarned?: string;
}

export interface IncentiveConfig {
  id: number;
  type: string;
  name: string;
  rate: number;
  formulaType: 'COUNT_MULTIPLY' | 'PERCENT';
  description?: string;
  positions: string[];
  isActive: boolean;
  sortOrder: number;
  isShared?: boolean; // If true, total is divided among eligible employees
}

export type DeductionCategory = 'GOVERNMENT' | 'INSURANCE' | 'LOANS' | 'OTHERS';

// Incentive Sheet types (branch-level daily input grid)
export interface IncentiveSheet {
  id: number;
  branchId: number;
  startDate: string;
  endDate: string;
  isDistributed: boolean;
}

export interface IncentiveSheetResponse {
  sheet: IncentiveSheet;
  days: string[];
  grid: Record<string, Record<string, number>>; // grid[type][date] = value
  totals: Record<string, number>;
  distributionPreview: DistributionPreviewItem[];
  employees: { id: number; position: PositionType; name: string }[];
}

export interface DistributionPreviewItem {
  configKey: string;
  label: string;
  sourceType: string;
  total: number;
  rate: number;
  numEligible: number;
  totalPay: number;
  perPerson: number;
  eligibleNames: string[];
}

export const SHARED_INCENTIVE_TYPES = ['GROOMING', 'SURGERY', 'EMERGENCY', 'CONFINEMENT'] as const;

export const SHARED_INCENTIVE_LABELS: Record<string, string> = {
  GROOMING: 'Grooming',
  SURGERY: 'Surgery',
  EMERGENCY: 'Emergency (P)',
  CONFINEMENT: 'Confinement',
};

export interface IncentiveInput {
  type: string;
  count: number;
  inputValue: number;
  rate?: number;
}

export interface Deduction {
  id: number;
  payrollId: number;
  type: string;
  amount: number;
  notes?: string;
}

export interface FixedDeduction {
  id: number;
  employeeId: number;
  type: string;
  category: DeductionCategory;
  amount: number;
  isActive: boolean;
}

export interface CashAdvance {
  id: number;
  employeeId: number;
  employee?: Employee;
  amount: number;
  dateTaken: string;
  dateDeducted?: string;
  isPaid: boolean;
  notes?: string;
}

export interface DashboardStats {
  totalBranches: number;
  totalEmployees: number;
  activeEmployees: number;
  pendingPayrolls: number;
  totalDisbursement: number;
  recentPayrolls: {
    id: number;
    employeeName: string;
    branchName: string;
    startDate: string;
    endDate: string;
    netPay: number;
    status: PayrollStatus;
  }[];
  branchSummaries: {
    id: number;
    name: string;
    type: BranchType;
    employeeCount: number;
    latestDisbursement: number;
  }[];
}

export const POSITION_LABELS: Record<PositionType, string> = {
  RESIDENT_VETERINARIAN: 'Resident Veterinarian',
  JUNIOR_VETERINARIAN: 'Junior Veterinarian',
  GROOMER: 'Groomer',
  GROOMER_VET_ASSISTANT: 'Groomer/Vet Assistant',
  VETERINARY_ASSISTANT: 'Veterinary Assistant',
  VETERINARY_NURSE: 'Veterinary Nurse',
  CLINIC_SECRETARY: 'Clinic Secretary',
  STAFF: 'Staff',
};

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  VETERINARY_CLINIC: 'Veterinary Clinic',
  VETERINARY_HOSPITAL: 'Veterinary Hospital',
  TRADING: 'Trading',
};

export const STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

export const INCENTIVE_TYPES = {
  VETERINARIAN: ['CBC', 'BLOOD_CHEM', 'ULTRASOUND', 'TEST_KITS', 'XRAY', 'SURGERY', 'EMERGENCY', 'CONFINEMENT_VET'],
  GROOMER: ['GROOMING'],
  ASSISTANT: ['SURGERY', 'EMERGENCY', 'CONFINEMENT_ASST', 'NURSING'],
  TRADING: ['TK_100', 'TK_90', 'MEDS_100', 'MEDS_90'],
};

export const DEDUCTION_TYPES = ['SSS', 'PHILHEALTH', 'PAGIBIG', 'WTAX', 'SUNLIFE', 'BPI_AIA', 'INSURANCE_OTHER', 'SSS_LOAN', 'PAGIBIG_LOAN', 'COMPANY_LOAN', 'UNIFORM', 'CASH_ADVANCE', 'LATE', 'OTHERS'];

export const DEDUCTION_CATEGORIES: Record<DeductionCategory, string> = {
  GOVERNMENT: 'Government Benefits',
  INSURANCE: 'Insurance',
  LOANS: 'Loans',
  OTHERS: 'Others',
};

export const DEDUCTION_BY_CATEGORY: Record<DeductionCategory, string[]> = {
  GOVERNMENT: ['SSS', 'PHILHEALTH', 'PAGIBIG', 'WTAX'],
  INSURANCE: ['SUNLIFE', 'BPI_AIA', 'INSURANCE_OTHER'],
  LOANS: ['SSS_LOAN', 'PAGIBIG_LOAN', 'COMPANY_LOAN'],
  OTHERS: ['UNIFORM', 'CASH_ADVANCE', 'LATE', 'OTHERS'],
};

export const INCENTIVE_LABELS: Record<string, string> = {
  CBC: 'CBC',
  BLOOD_CHEM: 'Blood Chem',
  ULTRASOUND: 'Ultrasound',
  TEST_KITS: 'Test Kits',
  SURGERY: 'Surgery',
  EMERGENCY: 'Emergency',
  XRAY: 'X-Ray',
  CONFINEMENT_VET: 'Confinement (Vet)',
  CONFINEMENT_ASST: 'Confinement (Asst)',
  GROOMING: 'Grooming',
  NURSING: 'Nursing',
  TK_100: 'TK 100%',
  TK_90: 'TK 90%',
  MEDS_100: 'Meds 100%',
  MEDS_90: 'Meds 90%',
};

// Default incentive rates for display
export const DEFAULT_INCENTIVE_RATES: Record<string, { rate: number; formulaType: 'COUNT_MULTIPLY' | 'PERCENT'; isShared?: boolean }> = {
  CBC: { rate: 50, formulaType: 'COUNT_MULTIPLY' },
  BLOOD_CHEM: { rate: 100, formulaType: 'COUNT_MULTIPLY' },
  ULTRASOUND: { rate: 100, formulaType: 'COUNT_MULTIPLY' },
  TEST_KITS: { rate: 50, formulaType: 'COUNT_MULTIPLY' },
  XRAY: { rate: 100, formulaType: 'COUNT_MULTIPLY' },
  SURGERY: { rate: 0.10, formulaType: 'PERCENT' },
  EMERGENCY: { rate: 0.40, formulaType: 'PERCENT' },
  CONFINEMENT_VET: { rate: 55, formulaType: 'COUNT_MULTIPLY', isShared: true },
  CONFINEMENT_ASST: { rate: 45, formulaType: 'COUNT_MULTIPLY', isShared: true },
  GROOMING: { rate: 75, formulaType: 'COUNT_MULTIPLY', isShared: true },
  NURSING: { rate: 80, formulaType: 'COUNT_MULTIPLY', isShared: true },
};

export const DEDUCTION_LABELS: Record<string, string> = {
  // Government Benefits
  SSS: 'SSS',
  PHILHEALTH: 'PhilHealth',
  PAGIBIG: 'Pag-IBIG',
  WTAX: 'W/Tax',
  // Insurance
  SUNLIFE: 'Sunlife',
  BPI_AIA: 'BPI AIA',
  INSURANCE_OTHER: 'Other Insurance',
  // Loans
  SSS_LOAN: 'SSS Loan',
  PAGIBIG_LOAN: 'Pag-IBIG Loan',
  COMPANY_LOAN: 'Company Loan',
  // Others
  UNIFORM: 'Uniform',
  CASH_ADVANCE: 'Cash Advance',
  LATE: 'Late',
  OTHERS: 'Others',
};
