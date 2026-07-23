import prisma from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/errors';
import { RecalculationService } from '../payroll/calculators/recalculation.service';
import { SHARED_TYPES } from './incentive-sheet.config';
import { calculateDistributions, calculatePreview, buildGrid, getDaysInRange } from './calculators/distribution.calculator';
import { MonetaryRules } from '../../shared/utils/monetary.utils';

export class IncentiveSheetService {
  private recalculationService = new RecalculationService();

  async getOrCreate(branchId: number, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let sheet = await prisma.incentiveSheet.findUnique({
      where: { branchId_startDate_endDate: { branchId, startDate: start, endDate: end } },
      include: { dailyInputs: { orderBy: [{ date: 'asc' }, { type: 'asc' }] } },
    });
    if (!sheet) {
      sheet = await prisma.incentiveSheet.create({
        data: { branchId, startDate: start, endDate: end },
        include: { dailyInputs: true },
      });
    }
    const days = getDaysInRange(start, end);
    const grid = buildGrid(sheet.dailyInputs, days);
    const totals: Record<string, number> = {};
    for (const type of SHARED_TYPES) {
      totals[type] = sheet.dailyInputs.filter((d) => d.type === type).reduce((sum, d) => sum + Number(d.value), 0);
    }
    const employees = await prisma.employee.findMany({
      where: { branchId, isActive: true },
      select: { id: true, position: true, name: true },
    });
    const exclusions = await prisma.incentiveExclusion.findMany({
      where: { employeeId: { in: employees.map((e) => e.id) } },
    });
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) exclusionMap.set(excl.employeeId, new Set());
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }
    const distributionPreview = calculatePreview(totals, employees, exclusionMap);
    return { sheet: { id: sheet.id, branchId: sheet.branchId, startDate: sheet.startDate.toISOString(), endDate: sheet.endDate.toISOString(), isDistributed: sheet.isDistributed }, days, grid, totals, distributionPreview, employees };
  }

  async saveInputs(sheetId: number, inputs: { date: string; type: string; value: number }[]) {
    const sheet = await prisma.incentiveSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundError('IncentiveSheet', sheetId);

    for (const input of inputs) {
      const date = new Date(input.date);
      const value = parseFloat(String(input.value)) || 0;
      if (value === 0) {
        await prisma.dailyIncentiveInput.deleteMany({ where: { incentiveSheetId: sheetId, date, type: input.type } });
      } else {
        await prisma.dailyIncentiveInput.upsert({
          where: { incentiveSheetId_date_type: { incentiveSheetId: sheetId, date, type: input.type } },
          update: { value }, create: { incentiveSheetId: sheetId, date, type: input.type, value },
        });
      }
    }

    const updatedSheet = await prisma.incentiveSheet.findUnique({
      where: { id: sheetId },
      include: { dailyInputs: { orderBy: [{ date: 'asc' }, { type: 'asc' }] } },
    });
    const totals: Record<string, number> = {};
    for (const type of SHARED_TYPES) {
      totals[type] = (updatedSheet?.dailyInputs || []).filter((d) => d.type === type).reduce((sum, d) => sum + Number(d.value), 0);
    }
    const employees = await prisma.employee.findMany({
      where: { branchId: sheet.branchId, isActive: true },
      select: { id: true, position: true, name: true },
    });
    const exclusions = await prisma.incentiveExclusion.findMany({
      where: { employeeId: { in: employees.map((e) => e.id) } },
    });
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) exclusionMap.set(excl.employeeId, new Set());
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }
    return { totals, distributionPreview: calculatePreview(totals, employees, exclusionMap) };
  }

  async distribute(sheetId: number) {
    const sheet = await prisma.incentiveSheet.findUnique({ where: { id: sheetId }, include: { dailyInputs: true } });
    if (!sheet) throw new NotFoundError('IncentiveSheet', sheetId);

    const totals: Record<string, number> = {};
    for (const type of SHARED_TYPES) {
      totals[type] = sheet.dailyInputs.filter((d) => d.type === type).reduce((sum, d) => sum + Number(d.value), 0);
    }

    const employees = await prisma.employee.findMany({ where: { branchId: sheet.branchId, isActive: true } });
    const exclusions = await prisma.incentiveExclusion.findMany({ where: { employeeId: { in: employees.map((e) => e.id) } } });
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) exclusionMap.set(excl.employeeId, new Set());
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }

    const payrolls = await prisma.payrollPeriod.findMany({
      where: { employeeId: { in: employees.map((e) => e.id) }, startDate: sheet.startDate, endDate: sheet.endDate },
      include: { employee: true, incentives: true },
    });
    const payrollMap = new Map(payrolls.map((p) => [p.employeeId, p]));
    const distributions = calculateDistributions(totals, employees as any, exclusionMap);

    return prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const dist of distributions) {
        const payroll = payrollMap.get(dist.employeeId);
        if (!payroll) continue;
        const existing = await tx.incentive.findFirst({ where: { payrollId: payroll.id, type: dist.incentiveType } });
        const roundedAmount = MonetaryRules.round(dist.amount);
        if (existing) {
          await tx.incentive.update({ where: { id: existing.id }, data: { count: dist.total, rate: dist.rate, amount: roundedAmount, formula: dist.formula } });
        } else {
          await tx.incentive.create({ data: { payrollId: payroll.id, type: dist.incentiveType, count: dist.total, rate: dist.rate, amount: roundedAmount, formula: dist.formula } });
        }
        results.push({ employeeId: dist.employeeId, employeeName: dist.employeeName, incentiveType: dist.incentiveType, amount: roundedAmount, formula: dist.formula });
      }
      for (const payroll of payrolls) {
        await this.recalculationService.recalculate(payroll.id, tx);
      }
      await tx.incentiveSheet.update({ where: { id: sheetId }, data: { isDistributed: true } });
      return { message: 'Incentives distributed successfully', distributions: results, affectedPayrolls: payrolls.length };
    });
  }

  async getConfig() {
    return { sharedTypes: SHARED_TYPES, distributionConfig: require('./incentive-sheet.config').DISTRIBUTION_CONFIG };
  }
}
