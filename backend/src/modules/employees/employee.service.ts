import prisma from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/errors';
import { RateCalculator } from '../payroll/calculators/rate.calculator';
import { PositionType, RateCalculationMethod } from '@prisma/client';

export class EmployeeService {
  async getAll(branchId?: number) {
    const where: any = { isActive: true };
    if (branchId) where.branchId = parseInt(String(branchId));
    return prisma.employee.findMany({ where, include: { branch: true, fixedDeductions: { where: { isActive: true } } }, orderBy: { name: 'asc' } });
  }

  async getById(id: number) {
    const e = await prisma.employee.findUnique({
      where: { id }, include: { branch: true, fixedDeductions: true, cashAdvances: { where: { isPaid: false }, orderBy: { dateTaken: 'desc' } }, payrollPeriods: { orderBy: { startDate: 'desc' }, take: 10, include: { incentives: true, deductions: true } } },
    });
    if (!e) throw new NotFoundError('Employee', id);
    return e;
  }

  async create(data: any) {
    const branch = await prisma.branch.findUnique({ where: { id: parseInt(data.branchId) } });
    const wd = branch?.workingDaysPerMonth ?? 22;
    const wh = branch?.workingHoursPerDay ?? 8;
    const method: RateCalculationMethod = data.calculationMethod || RateCalculator.getDefaultCalculationMethod(data.position);
    let ratePerDay: number, ratePerHour: number;
    if (data.ratePerDay !== undefined && data.ratePerHour !== undefined) {
      ratePerDay = parseFloat(data.ratePerDay); ratePerHour = parseFloat(data.ratePerHour);
    } else {
      const rates = RateCalculator.calculateEmployeeRates(parseFloat(data.salary), method, wd, wh);
      ratePerDay = rates.ratePerDay; ratePerHour = rates.ratePerHour;
    }
    return prisma.employee.create({
      data: {
        branchId: parseInt(data.branchId), name: data.name, position: data.position, calculationMethod: method,
        salary: parseFloat(data.salary), ratePerDay, ratePerHour,
        address: data.address, sssNo: data.sssNo, tinNo: data.tinNo, philhealthNo: data.philhealthNo, pagibigNo: data.pagibigNo,
        hiredOn: data.hiredOn ? new Date(data.hiredOn) : null,
        fixedDeductions: data.fixedDeductions ? { create: data.fixedDeductions.map((fd: any) => ({ type: fd.type, amount: fd.amount, category: fd.category || 'OTHERS' })) } : undefined,
      },
      include: { branch: true, fixedDeductions: true },
    });
  }

  async update(id: number, data: any) {
    const existing = await prisma.employee.findUnique({ where: { id }, include: { branch: true } });
    if (!existing) throw new NotFoundError('Employee', id);
    const branch = data.branchId ? await prisma.branch.findUnique({ where: { id: parseInt(data.branchId) } }) : existing.branch;
    const wd = branch?.workingDaysPerMonth ?? 22;
    const wh = branch?.workingHoursPerDay ?? 8;
    const updateData: any = { branchId: data.branchId ? parseInt(data.branchId) : undefined, name: data.name, position: data.position, address: data.address, sssNo: data.sssNo, tinNo: data.tinNo, philhealthNo: data.philhealthNo, pagibigNo: data.pagibigNo, hiredOn: data.hiredOn ? new Date(data.hiredOn) : undefined, isActive: data.isActive };
    const calcMethod: RateCalculationMethod = data.calculationMethod || existing.calculationMethod;
    updateData.calculationMethod = calcMethod;
    if (data.salary !== undefined) updateData.salary = parseFloat(data.salary);
    if (data.ratePerDay !== undefined && data.ratePerHour !== undefined) {
      updateData.ratePerDay = parseFloat(data.ratePerDay); updateData.ratePerHour = parseFloat(data.ratePerHour);
    } else if ((data.recalculateRates && data.salary !== undefined) || (data.calculationMethod && data.calculationMethod !== existing.calculationMethod)) {
      const salaryToUse = data.salary !== undefined ? parseFloat(data.salary) : Number(existing.salary);
      const rates = RateCalculator.calculateEmployeeRates(salaryToUse, calcMethod, wd, wh);
      updateData.ratePerDay = rates.ratePerDay; updateData.ratePerHour = rates.ratePerHour;
    }
    return prisma.employee.update({ where: { id }, data: updateData, include: { branch: true, fixedDeductions: true } });
  }

  async recalculateRates(id: number) {
    const e = await prisma.employee.findUnique({ where: { id }, include: { branch: true } });
    if (!e) throw new NotFoundError('Employee', id);
    const wd = e.branch?.workingDaysPerMonth ?? 22;
    const wh = e.branch?.workingHoursPerDay ?? 8;
    const rates = RateCalculator.calculateEmployeeRates(Number(e.salary), e.calculationMethod as 'MONTHLY' | 'ANNUAL', wd, wh);
    return prisma.employee.update({ where: { id }, data: { ratePerDay: rates.ratePerDay, ratePerHour: rates.ratePerHour }, include: { branch: true, fixedDeductions: true } });
  }

  async softDelete(id: number) {
    await prisma.employee.update({ where: { id }, data: { isActive: false } });
    return { message: 'Employee deleted successfully' };
  }

  async getFixedDeductions(id: number) {
    const e = await prisma.employee.findUnique({ where: { id }, include: { fixedDeductions: { orderBy: { type: 'asc' } } } });
    if (!e) throw new NotFoundError('Employee', id);
    return { fixedDeductions: e.fixedDeductions };
  }

  async updateFixedDeductions(id: number, deductions: any[]) {
    const existingFixed = await prisma.fixedDeduction.findMany({ where: { employeeId: id } });
    const existingTypes = new Set(existingFixed.map((fd) => fd.type));
    const newTypes = new Set(deductions && deductions.length > 0 ? deductions.map((d: any) => d.type) : []);
    const removedTypes = Array.from(existingTypes).filter((t) => !newTypes.has(t));
    await prisma.fixedDeduction.deleteMany({ where: { employeeId: id } });
    if (deductions && deductions.length > 0) {
      await prisma.fixedDeduction.createMany({ data: deductions.map((d: any) => ({ employeeId: id, type: d.type, amount: d.amount, category: d.category || 'OTHERS', isActive: true })) });
    }
    const payrollPeriods = await prisma.payrollPeriod.findMany({ where: { employeeId: id }, select: { id: true, deductionDivisor: true } });
    const updated = deductions && deductions.length > 0 ? deductions.filter((d: any) => d.amount > 0) : [];
    const RecalculationService = (await import('../payroll/calculators/recalculation.service')).RecalculationService;
    const recalc = new RecalculationService();
    for (const payroll of payrollPeriods) {
      if (removedTypes.length > 0) await prisma.deduction.deleteMany({ where: { payrollId: payroll.id, type: { in: removedTypes } } });
      if (updated.length > 0) {
        await prisma.deduction.deleteMany({ where: { payrollId: payroll.id, type: { in: updated.map((d: any) => d.type) } } });
        for (const fd of updated) {
          await prisma.deduction.create({ data: { payrollId: payroll.id, type: fd.type, amount: Math.round((Number(fd.amount) / payroll.deductionDivisor) * 100) / 100 } });
        }
      }
      await recalc.recalculate(payroll.id);
    }
    return prisma.employee.findUnique({ where: { id }, include: { fixedDeductions: true } });
  }

  async toggleExclusion(employeeId: number, incentiveType: string) {
    const e = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!e) throw new NotFoundError('Employee', employeeId);
    const existing = await prisma.incentiveExclusion.findUnique({ where: { employeeId_incentiveType: { employeeId, incentiveType } } });
    if (existing) {
      await prisma.incentiveExclusion.delete({ where: { id: existing.id } });
      return { excluded: false, message: 'Incentive exclusion removed' };
    }
    const exclusion = await prisma.incentiveExclusion.create({ data: { employeeId, incentiveType } });
    return { excluded: true, exclusion, message: 'Incentive exclusion added' };
  }

  async getExclusions(employeeId: number) {
    return prisma.incentiveExclusion.findMany({ where: { employeeId }, orderBy: { incentiveType: 'asc' } });
  }

  async getFormulaInfo(position: PositionType, method?: string) {
    const usesAnnual = method ? method === 'ANNUAL' : RateCalculator.usesAnnualFormula(position);
    return { position, usesAnnualFormula: usesAnnual, formulaDescription: method ? (method === 'ANNUAL' ? 'Annual: (Salary × 12) ÷ 313' : 'Monthly: Salary ÷ D (branch days)') : (RateCalculator.usesAnnualFormula(position) ? 'Annual: (Salary × 12) ÷ 313' : 'Monthly: Salary ÷ D (branch days)') };
  }
}
