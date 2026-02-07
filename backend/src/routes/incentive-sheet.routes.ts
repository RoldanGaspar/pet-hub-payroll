import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { PositionType } from '@prisma/client';

const router = Router();

// ============== SHARED INCENTIVE TYPES & DISTRIBUTION CONFIG ==============

// The 4 shared incentive types entered in the daily grid
const SHARED_TYPES = ['GROOMING', 'SURGERY', 'EMERGENCY', 'CONFINEMENT'] as const;

// Distribution config item interface
interface DistConfigItem {
  rate: number;
  label: string;
  eligiblePositions: PositionType[]; // Who RECEIVES the incentive
  divisionPositions?: PositionType[]; // Who is counted for DIVISION (defaults to eligiblePositions)
  incentiveType: string;
  sourceType?: string;
}

// Distribution configuration:
// For each shared type, define the rate and which positions receive the distributed pay
const DISTRIBUTION_CONFIG: Record<string, DistConfigItem> = {
  GROOMING: {
    rate: 75,
    label: 'Grooming',
    eligiblePositions: [
      PositionType.GROOMER,
      PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'GROOMING',
  },
  SURGERY: {
    rate: 100,
    label: 'Surgery',
    eligiblePositions: [
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.CLINIC_SECRETARY,
      PositionType.STAFF,
      PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'SURGERY',
  },
  EMERGENCY: {
    rate: 120,
    label: 'Emergency',
    eligiblePositions: [
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.CLINIC_SECRETARY,
      PositionType.STAFF,
      PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'EMERGENCY',
  },
  // Confinement is special: two different rates for vets vs. staff
  // Only Resident Vets RECEIVE it, but ALL vets (Resident + Junior) are counted for DIVISION
  CONFINEMENT_VET: {
    rate: 55,
    label: 'Confinement (Vet)',
    eligiblePositions: [
      PositionType.RESIDENT_VETERINARIAN, // Only Resident Vets receive
    ],
    divisionPositions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN, // ALL vets counted for division
    ],
    incentiveType: 'CONFINEMENT_VET',
    sourceType: 'CONFINEMENT',
  },
  CONFINEMENT_STAFF: {
    rate: 45,
    label: 'Confinement (Staff)',
    eligiblePositions: [
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.CLINIC_SECRETARY,
      PositionType.STAFF,
      PositionType.GROOMER_VET_ASSISTANT,
    ],
    incentiveType: 'CONFINEMENT_ASST',
    sourceType: 'CONFINEMENT',
  },
};

// ============== ROUTES ==============

// GET: Get or create an incentive sheet for a branch + date range
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    if (!branchId || !startDate || !endDate) {
      return res.status(400).json({ error: 'branchId, startDate, and endDate are required' });
    }

    const branchIdNum = parseInt(branchId as string);
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Try to find existing sheet
    let sheet = await prisma.incentiveSheet.findUnique({
      where: {
        branchId_startDate_endDate: {
          branchId: branchIdNum,
          startDate: start,
          endDate: end,
        },
      },
      include: {
        dailyInputs: {
          orderBy: [{ date: 'asc' }, { type: 'asc' }],
        },
      },
    });

    // If no sheet exists, create one
    if (!sheet) {
      sheet = await prisma.incentiveSheet.create({
        data: {
          branchId: branchIdNum,
          startDate: start,
          endDate: end,
        },
        include: {
          dailyInputs: true,
        },
      });
    }

    // Build the full grid structure (fill in missing days/types with 0)
    const days = getDaysInRange(start, end);
    const gridData = buildGrid(sheet.dailyInputs, days);

    // Calculate totals per type
    const totals: Record<string, number> = {};
    for (const type of SHARED_TYPES) {
      totals[type] = sheet.dailyInputs
        .filter((d) => d.type === type)
        .reduce((sum, d) => sum + Number(d.value), 0);
    }

    // Get eligible employee counts for distribution preview
    const employees = await prisma.employee.findMany({
      where: { branchId: branchIdNum, isActive: true },
      select: { id: true, position: true, name: true },
    });

    // Fetch exclusions for these employees
    const exclusions = await prisma.incentiveExclusion.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    // Build exclusion map
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) {
        exclusionMap.set(excl.employeeId, new Set());
      }
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }

    const distributionPreview = calculateDistributionPreview(totals, employees, exclusionMap);

    return res.json({
      sheet: {
        id: sheet.id,
        branchId: sheet.branchId,
        startDate: sheet.startDate,
        endDate: sheet.endDate,
        isDistributed: sheet.isDistributed,
      },
      days,
      grid: gridData,
      totals,
      distributionPreview,
      employees,
    });
  } catch (error) {
    console.error('Get incentive sheet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Save daily inputs (batch upsert)
router.put('/:id/inputs', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sheetId = parseInt(req.params.id as string);
    const { inputs } = req.body;
    // inputs: Array of { date: string, type: string, value: number }

    if (!inputs || !Array.isArray(inputs)) {
      return res.status(400).json({ error: 'inputs array is required' });
    }

    const sheet = await prisma.incentiveSheet.findUnique({
      where: { id: sheetId },
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Incentive sheet not found' });
    }

    // Upsert each input
    for (const input of inputs) {
      const date = new Date(input.date);
      const value = parseFloat(input.value) || 0;

      if (value === 0) {
        // Delete if value is 0 to keep table clean
        await prisma.dailyIncentiveInput.deleteMany({
          where: {
            incentiveSheetId: sheetId,
            date,
            type: input.type,
          },
        });
      } else {
        await prisma.dailyIncentiveInput.upsert({
          where: {
            incentiveSheetId_date_type: {
              incentiveSheetId: sheetId,
              date,
              type: input.type,
            },
          },
          update: { value },
          create: {
            incentiveSheetId: sheetId,
            date,
            type: input.type,
            value,
          },
        });
      }
    }

    // Re-fetch updated data
    const updatedSheet = await prisma.incentiveSheet.findUnique({
      where: { id: sheetId },
      include: {
        dailyInputs: {
          orderBy: [{ date: 'asc' }, { type: 'asc' }],
        },
      },
    });

    // Calculate totals
    const totals: Record<string, number> = {};
    for (const type of SHARED_TYPES) {
      totals[type] = (updatedSheet?.dailyInputs || [])
        .filter((d) => d.type === type)
        .reduce((sum, d) => sum + Number(d.value), 0);
    }

    // Get employees for distribution preview
    const employees = await prisma.employee.findMany({
      where: { branchId: sheet.branchId, isActive: true },
      select: { id: true, position: true, name: true },
    });

    // Fetch exclusions for these employees
    const exclusions = await prisma.incentiveExclusion.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    // Build exclusion map
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) {
        exclusionMap.set(excl.employeeId, new Set());
      }
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }

    const distributionPreview = calculateDistributionPreview(totals, employees, exclusionMap);

    return res.json({
      totals,
      distributionPreview,
    });
  } catch (error) {
    console.error('Update incentive sheet inputs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Distribute incentives to employee payrolls
router.post('/:id/distribute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sheetId = parseInt(req.params.id as string);

    const sheet = await prisma.incentiveSheet.findUnique({
      where: { id: sheetId },
      include: {
        dailyInputs: true,
      },
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Incentive sheet not found' });
    }

    // Calculate totals per type
    const totals: Record<string, number> = {};
    for (const type of SHARED_TYPES) {
      totals[type] = sheet.dailyInputs
        .filter((d) => d.type === type)
        .reduce((sum, d) => sum + Number(d.value), 0);
    }

    // Get all active employees in the branch
    const employees = await prisma.employee.findMany({
      where: { branchId: sheet.branchId, isActive: true },
    });

    // Fetch exclusions for these employees
    const exclusions = await prisma.incentiveExclusion.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    // Build exclusion map: employeeId -> Set of excluded incentive types
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) {
        exclusionMap.set(excl.employeeId, new Set());
      }
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }

    // Get all payroll periods for these employees matching the date range
    const payrolls = await prisma.payrollPeriod.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        startDate: sheet.startDate,
        endDate: sheet.endDate,
      },
      include: { employee: true, incentives: true },
    });

    // Create a map of employeeId -> payroll
    const payrollMap = new Map(payrolls.map((p) => [p.employeeId, p]));

    // Build distribution map: which employees get what amounts (excluding NOT INCLUDED)
    const distributions = calculateDistributions(totals, employees, exclusionMap);

    // Apply distributions to payrolls
    const results: any[] = [];

    for (const dist of distributions) {
      const payroll = payrollMap.get(dist.employeeId);
      if (!payroll) continue;

      // Upsert the incentive record for this employee's payroll
      const existing = await prisma.incentive.findFirst({
        where: {
          payrollId: payroll.id,
          type: dist.incentiveType,
        },
      });

      const roundedAmount = Math.round(dist.amount * 100) / 100;

      if (existing) {
        await prisma.incentive.update({
          where: { id: existing.id },
          data: {
            count: dist.total,
            rate: dist.rate,
            amount: roundedAmount,
            formula: dist.formula,
          },
        });
      } else {
        await prisma.incentive.create({
          data: {
            payrollId: payroll.id,
            type: dist.incentiveType,
            count: dist.total,
            rate: dist.rate,
            amount: roundedAmount,
            formula: dist.formula,
          },
        });
      }

      results.push({
        employeeId: dist.employeeId,
        employeeName: dist.employeeName,
        incentiveType: dist.incentiveType,
        amount: roundedAmount,
        formula: dist.formula,
      });
    }

    // Recalculate payroll totals for all affected payrolls
    for (const payroll of payrolls) {
      await recalculatePayrollTotals(payroll.id);
    }

    // Mark sheet as distributed
    await prisma.incentiveSheet.update({
      where: { id: sheetId },
      data: { isDistributed: true },
    });

    return res.json({
      message: 'Incentives distributed successfully',
      distributions: results,
      affectedPayrolls: payrolls.length,
    });
  } catch (error) {
    console.error('Distribute incentives error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Get distribution config (for frontend display)
router.get('/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    return res.json({
      sharedTypes: SHARED_TYPES,
      distributionConfig: DISTRIBUTION_CONFIG,
    });
  } catch (error) {
    console.error('Get distribution config error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============== HELPER FUNCTIONS ==============

function getDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function buildGrid(
  dailyInputs: { date: Date; type: string; value: any }[],
  days: string[]
): Record<string, Record<string, number>> {
  // grid[type][dateStr] = value
  const grid: Record<string, Record<string, number>> = {};

  for (const type of SHARED_TYPES) {
    grid[type] = {};
    for (const day of days) {
      grid[type][day] = 0;
    }
  }

  for (const input of dailyInputs) {
    const dateStr = new Date(input.date).toISOString().split('T')[0];
    if (grid[input.type]) {
      grid[input.type][dateStr] = Number(input.value);
    }
  }

  return grid;
}

interface DistributionResult {
  employeeId: number;
  employeeName: string;
  incentiveType: string;
  total: number;
  rate: number;
  numEligible: number;
  amount: number;
  formula: string;
}

function calculateDistributions(
  totals: Record<string, number>,
  employees: { id: number; name: string; position: PositionType }[],
  exclusions: Map<number, Set<string>> = new Map() // employeeId -> Set of excluded incentive types
): DistributionResult[] {
  const results: DistributionResult[] = [];

  for (const [configKey, config] of Object.entries(DISTRIBUTION_CONFIG)) {
    const sourceType = config.sourceType || configKey;
    const total = totals[sourceType] || 0;

    if (total === 0) continue;

    // Who RECEIVES the incentive (excluding those marked as NOT INCLUDED)
    const receivers = employees.filter((e) => {
      const isEligible = config.eligiblePositions.includes(e.position);
      const isExcluded = exclusions.get(e.id)?.has(config.incentiveType);
      return isEligible && !isExcluded;
    });

    if (receivers.length === 0) continue;

    // Who is counted for DIVISION (excluding those marked as NOT INCLUDED)
    const divisionPositions = config.divisionPositions || config.eligiblePositions;
    const divisionEmployees = employees.filter((e) => {
      const isEligible = divisionPositions.includes(e.position);
      const isExcluded = exclusions.get(e.id)?.has(config.incentiveType);
      return isEligible && !isExcluded;
    });
    const divisionCount = divisionEmployees.length;

    const totalPay = total * config.rate;
    const perPerson = totalPay / (divisionCount > 0 ? divisionCount : 1);

    for (const emp of receivers) {
      results.push({
        employeeId: emp.id,
        employeeName: emp.name,
        incentiveType: config.incentiveType,
        total,
        rate: config.rate,
        numEligible: divisionCount,
        amount: Math.round(perPerson * 100) / 100,
        formula: `(${total} × ₱${config.rate}) ÷ ${divisionCount} = ₱${(Math.round(perPerson * 100) / 100).toLocaleString()}`,
      });
    }
  }

  return results;
}

interface DistributionPreviewItem {
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

function calculateDistributionPreview(
  totals: Record<string, number>,
  employees: { id: number; position: PositionType; name: string }[],
  exclusions: Map<number, Set<string>> = new Map()
): DistributionPreviewItem[] {
  const preview: DistributionPreviewItem[] = [];

  for (const [configKey, config] of Object.entries(DISTRIBUTION_CONFIG)) {
    const sourceType = config.sourceType || configKey;
    const total = totals[sourceType] || 0;

    // Who receives (excluding NOT INCLUDED)
    const receivers = employees.filter((e) => {
      const isEligible = config.eligiblePositions.includes(e.position);
      const isExcluded = exclusions.get(e.id)?.has(config.incentiveType);
      return isEligible && !isExcluded;
    });

    // Who counts for division (excluding NOT INCLUDED)
    const divisionPositions = config.divisionPositions || config.eligiblePositions;
    const divisionCount = employees.filter((e) => {
      const isEligible = divisionPositions.includes(e.position);
      const isExcluded = exclusions.get(e.id)?.has(config.incentiveType);
      return isEligible && !isExcluded;
    }).length;

    const totalPay = total * config.rate;
    const perPerson = divisionCount > 0 ? totalPay / divisionCount : 0;

    preview.push({
      configKey,
      label: config.label,
      sourceType,
      total,
      rate: config.rate,
      numEligible: divisionCount,
      totalPay: Math.round(totalPay * 100) / 100,
      perPerson: Math.round(perPerson * 100) / 100,
      eligibleNames: receivers.map((e) => e.name),
    });
  }

  return preview;
}

// Recalculate payroll totals after distributing incentives
async function recalculatePayrollTotals(payrollId: number) {
  const allIncentives = await prisma.incentive.findMany({
    where: { payrollId },
  });
  const totalIncentives = allIncentives.reduce((sum, i) => sum + Number(i.amount), 0);

  const payroll = await prisma.payrollPeriod.findUnique({
    where: { id: payrollId },
    include: { employee: true },
  });

  if (!payroll) return;

  const allDeductions = await prisma.deduction.findMany({
    where: { payrollId },
  });
  const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

  const ratePerDay = Number(payroll.employee.ratePerDay);
  const ratePerHour = Number(payroll.employee.ratePerHour);

  // Recalculate totalDaysPresent: Working Days - Rest Days (dayOff) - Absences
  const calculatedDaysPresent = payroll.workingDays - payroll.dayOff - payroll.absences;

  const basicPay = ratePerDay * calculatedDaysPresent;
  const holidayPay = Number(payroll.holidays) * ratePerDay;
  const overtimePay = ratePerHour * Number(payroll.overtimeHours);
  const lateDeduction = ratePerHour * (Number(payroll.lateMinutes) / 60);

  const grossPay =
    basicPay +
    holidayPay +
    overtimePay +
    totalIncentives +
    Number(payroll.mealAllowance) +
    Number(payroll.silPay) +
    Number(payroll.birthdayLeave);

  const netPay = grossPay - totalDeductions - lateDeduction;

  await prisma.payrollPeriod.update({
    where: { id: payrollId },
    data: {
      totalDaysPresent: calculatedDaysPresent, // Update with recalculated value
      totalIncentives,
      totalDeductions,
      basicPay: Math.round(basicPay * 100) / 100,
      holidayPay: Math.round(holidayPay * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    },
  });
}

export default router;
