import prisma from '../../shared/database/prisma';
import { TxClient } from '../../shared/types/common.types';
import { NotFoundError } from '../../shared/errors';
import { IncentiveCalculator, FormulaType, DEFAULT_INCENTIVE_CONFIG } from './calculators/incentive.calculator';
import { RecalculationService } from '../payroll/calculators/recalculation.service';
import { MonetaryRules } from '../../shared/utils/monetary.utils';
import { assertPayrollEditable } from '../payroll/payroll-lock';

interface CreateIncentiveInput {
  payrollId: number;
  type: string;
  count?: number;
  inputValue?: number;
  rate?: number;
  dateEarned?: string;
}

export class IncentiveService {
  private recalculationService = new RecalculationService();

  private async assertEditable(payrollId: number, db: TxClient | typeof prisma = prisma) {
    const payroll = await db.payrollPeriod.findUnique({ where: { id: payrollId }, select: { id: true, status: true } });
    assertPayrollEditable(payroll);
  }

  async getConfig() {
    let configs = await prisma.incentiveConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (configs.length === 0) {
      return DEFAULT_INCENTIVE_CONFIG;
    }
    return configs;
  }

  async getConfigForPosition(position: string) {
    const configs = await prisma.incentiveConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (configs.length === 0) {
      return IncentiveCalculator.getTypesForPosition(position as any);
    }
    return configs.filter((c) => c.positions.includes(position));
  }

  async updateConfig(type: string, data: any) {
    const config = await prisma.incentiveConfig.upsert({
      where: { type },
      update: {
        rate: data.rate !== undefined ? data.rate : undefined,
        name: data.name !== undefined ? data.name : undefined,
        description: data.description !== undefined ? data.description : undefined,
        positions: data.positions !== undefined ? data.positions : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      create: {
        type, name: data.name || type, rate: data.rate || 0,
        formulaType: 'COUNT_MULTIPLY', description: data.description || '',
        positions: data.positions || [], isActive: data.isActive ?? true, sortOrder: 99,
      },
    });
    return config;
  }

  async initConfig() {
    const existing = await prisma.incentiveConfig.count();
    if (existing > 0) throw new Error('Configs already initialized');
    await prisma.incentiveConfig.createMany({
      data: DEFAULT_INCENTIVE_CONFIG.map((c) => ({
        type: c.type, name: c.name, rate: c.rate, formulaType: c.formulaType,
        description: c.description, positions: c.positions as any, isActive: true, sortOrder: c.sortOrder,
      })),
    });
    return prisma.incentiveConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async getEligibleCounts(branchId: number) {
    const employees = await prisma.employee.findMany({
      where: { branchId, isActive: true },
      select: { id: true, position: true },
    });
    const exclusions = await prisma.incentiveExclusion.findMany({
      where: { employeeId: { in: employees.map((e) => e.id) } },
    });
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) exclusionMap.set(excl.employeeId, new Set());
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }
    const sharedTypes = DEFAULT_INCENTIVE_CONFIG.filter((c) => c.isShared);
    const eligibleCounts: Record<string, number> = {};
    for (const config of sharedTypes) {
      const divisionPositions = config.divisionPositions || config.positions;
      eligibleCounts[config.type] = employees.filter((e) => {
        const excluded = exclusionMap.get(e.id)?.has(config.type);
        return divisionPositions.includes(e.position) && !excluded;
      }).length;
    }
    return eligibleCounts;
  }

  async getByPayroll(payrollId: number) {
    return prisma.incentive.findMany({
      where: { payrollId },
      orderBy: { type: 'asc' },
    });
  }

  async create(input: CreateIncentiveInput, tx?: TxClient) {
    const db = tx || prisma;
    const { payrollId, type, count, inputValue, rate, dateEarned } = input;
    await this.assertEditable(payrollId, db);
    const config = await db.incentiveConfig.findUnique({ where: { type } }) 
      || DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
    const effectiveRate = rate ?? (config as any)?.rate ?? 0;
    const formulaType = (config as any)?.formulaType || 'COUNT_MULTIPLY';

    const result = IncentiveCalculator.calculate({
      type, count: count || 0, inputValue: inputValue || 0,
      rate: effectiveRate, formulaType: formulaType as FormulaType,
    });

    const existing = await db.incentive.findFirst({ where: { payrollId, type } });
    let incentive;
    if (existing) {
      incentive = await db.incentive.update({
        where: { id: existing.id },
        data: { count: count ?? existing.count, inputValue: inputValue ?? existing.inputValue,
          rate: effectiveRate, amount: result.amount, formula: result.formula,
          dateEarned: dateEarned ? new Date(dateEarned) : existing.dateEarned },
      });
    } else {
      incentive = await db.incentive.create({
        data: { payrollId, type, count: count || 0, inputValue: inputValue || 0,
          rate: effectiveRate, amount: result.amount, formula: result.formula,
          dateEarned: dateEarned ? new Date(dateEarned) : null },
      });
    }
    await this.recalculationService.recalculate(payrollId, tx);
    return incentive;
  }

  async bulkUpdate(payrollId: number, incentives: any[], tx?: TxClient) {
    const db = tx || prisma;
    const payroll = await db.payrollPeriod.findUnique({
      where: { id: payrollId }, include: { employee: true },
    });
    if (!payroll) throw new NotFoundError('PayrollPeriod', payrollId);
    assertPayrollEditable(payroll);

    const branchEmployees = await db.employee.findMany({
      where: { branchId: payroll.employee.branchId, isActive: true },
      select: { id: true, position: true },
    });
    const exclusions = await db.incentiveExclusion.findMany({
      where: { employeeId: { in: branchEmployees.map((e) => e.id) } },
    });
    const exclusionMap = new Map<number, Set<string>>();
    for (const excl of exclusions) {
      if (!exclusionMap.has(excl.employeeId)) exclusionMap.set(excl.employeeId, new Set());
      exclusionMap.get(excl.employeeId)!.add(excl.incentiveType);
    }

    const eligibleCountsMap: Record<string, number> = {};
    for (const inc of incentives || []) {
      if (IncentiveCalculator.isShared(inc.type)) {
        const eligiblePositions = IncentiveCalculator.getDivisionPositions(inc.type);
        eligibleCountsMap[inc.type] = branchEmployees.filter((e) => {
          const excluded = exclusionMap.get(e.id)?.has(inc.type);
          return eligiblePositions.includes(e.position) && !excluded;
        }).length;
      }
    }

    await db.incentive.deleteMany({ where: { payrollId } });
    const configs = await db.incentiveConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.type, c]));

    const incentiveData = [];
    for (const inc of incentives || []) {
      let config = configMap.get(inc.type) || DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === inc.type);
      const effectiveRate = inc.rate ?? (config as any)?.rate ?? 0;
      const formulaType = (config as any)?.formulaType || 'COUNT_MULTIPLY';
      const shouldDivide = IncentiveCalculator.isShared(inc.type) && inc.type !== 'GROOMING' && inc.type !== 'NURSING';
      const numEligible = shouldDivide ? eligibleCountsMap[inc.type] || 1 : undefined;

      const result = IncentiveCalculator.calculate({
        type: inc.type, count: inc.count || 0, inputValue: inc.inputValue || 0,
        rate: effectiveRate, formulaType: formulaType as FormulaType, numEligible,
      });

      if (inc.count > 0 || inc.inputValue > 0) {
        incentiveData.push({
          payrollId, type: inc.type, count: inc.count || 0, inputValue: inc.inputValue || 0,
          rate: effectiveRate, amount: result.amount, formula: result.formula,
          dateEarned: inc.dateEarned ? new Date(inc.dateEarned) : null,
        });
      }
    }

    if (incentiveData.length > 0) {
      await db.incentive.createMany({ data: incentiveData });
    }
    await this.recalculationService.recalculate(payrollId, tx);
    return db.payrollPeriod.findUnique({
      where: { id: payrollId },
      include: { employee: true, incentives: { orderBy: { type: 'asc' } }, deductions: true },
    });
  }

  async calculatePreview(position: string, incentives: any[]) {
    const configs = await prisma.incentiveConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.type, c]));
    const results: any[] = [];
    let totalCount = 0;
    let totalAmount = 0;

    for (const inc of incentives || []) {
      let config = configMap.get(inc.type) || DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === inc.type);
      const effectiveRate = inc.rate ?? (config as any)?.rate ?? 0;
      const formulaType = (config as any)?.formulaType || 'COUNT_MULTIPLY';
      const result = IncentiveCalculator.calculate({
        type: inc.type, count: inc.count || 0, inputValue: inc.inputValue || 0,
        rate: effectiveRate, formulaType: formulaType as FormulaType,
      });
      if (formulaType === 'COUNT_MULTIPLY') totalCount += inc.count || 0;
      totalAmount += result.amount;
      results.push({
        type: inc.type, name: (config as any)?.name || inc.type,
        count: inc.count || 0, inputValue: inc.inputValue || 0,
        rate: effectiveRate, formulaType, amount: result.amount, formula: result.formula,
      });
    }
    return { incentives: results, totalCount, totalAmount: MonetaryRules.round(totalAmount) };
  }

  async delete(id: number, tx?: TxClient) {
    const db = tx || prisma;
    const existing = await db.incentive.findUnique({ where: { id }, select: { payrollId: true } });
    if (!existing) throw new NotFoundError('Incentive', id);
    await this.assertEditable(existing.payrollId, db);
    const incentive = await db.incentive.delete({ where: { id } });
    await this.recalculationService.recalculate(incentive.payrollId, tx);
    return { message: 'Incentive deleted successfully' };
  }
}
