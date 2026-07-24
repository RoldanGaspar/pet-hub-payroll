import prisma from '../../shared/database/prisma';
import { NotFoundError, ValidationError } from '../../shared/errors';
import { RateCalculator } from '../payroll/calculators/rate.calculator';

export class BranchService {
  async getAll(query: {
    search?: string;
    type?: string;
    status?: string;
    sort?: string;
    order?: string;
  }) {
    const where: any = {};
    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: any = {};
    if (query.sort === 'employeeCount') {
      orderBy.employees = { _count: query.order || 'asc' };
    } else {
      orderBy.name = query.order || 'asc';
    }

    const branches = await prisma.branch.findMany({
      where,
      include: {
        _count: { select: { employees: { where: { isActive: true } } } },
        users: { select: { id: true, name: true, role: true } },
      },
      orderBy,
    });

    return branches.map((b) => ({
      ...b,
      employeeCount: b._count.employees,
      branchManager: b.users.find((u) => u.role === 'BRANCH_MANAGER') || null,
    }));
  }

  async getById(id: number) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: { where: { isActive: true } } } },
        users: { select: { id: true, name: true, role: true } },
      },
    });
    if (!branch) throw new NotFoundError('Branch', id);
    return {
      ...branch,
      employeeCount: branch._count.employees,
      branchManager: branch.users.find((u) => u.role === 'BRANCH_MANAGER') || null,
    };
  }

  async create(data: any) {
    return prisma.branch.create({
      data: {
        name: data.name,
        address: data.address,
        contact: data.contact,
        type: data.type || 'VETERINARY_CLINIC',
        workingDaysPerMonth: data.workingDaysPerMonth ?? 22,
        workingHoursPerDay: data.workingHoursPerDay ?? 8,
      },
    });
  }

  async update(id: number, data: any) {
    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        contact: data.contact,
        type: data.type,
      },
    });
    return branch;
  }

  async getImpact(id: number, newSettings?: { workingDaysPerMonth?: number; workingHoursPerDay?: number }) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        employees: {
          where: { isActive: true },
          select: { id: true, name: true, position: true, calculationMethod: true, salary: true, ratePerDay: true, ratePerHour: true },
        },
      },
    });
    if (!branch) throw new NotFoundError('Branch', id);

    const currentD = branch.workingDaysPerMonth;
    const currentH = branch.workingHoursPerDay;
    const newD = newSettings?.workingDaysPerMonth ?? currentD;
    const newH = newSettings?.workingHoursPerDay ?? currentH;

    const hasDChanged = newD !== currentD;
    const hasHChanged = newH !== currentH;

    if (!hasDChanged && !hasHChanged) {
      return { hasChanges: false, message: 'No payroll setting changes detected.' };
    }

    const affectedEmployees = branch.employees.map((emp) => {
      const oldRates = {
        ratePerDay: Number(emp.ratePerDay),
        ratePerHour: Number(emp.ratePerHour),
      };
      const newRates = {
        ratePerDay: hasDChanged
          ? (emp.calculationMethod === 'MONTHLY'
              ? RateCalculator.calculateMonthly(Number(emp.salary), newD, newH).ratePerDay
              : RateCalculator.calculateAnnual(Number(emp.salary), newH).ratePerDay)
          : oldRates.ratePerDay,
        ratePerHour: hasHChanged
          ? RateCalculator.calculateRatePerHour(
              hasDChanged
                ? (emp.calculationMethod === 'MONTHLY'
                    ? RateCalculator.calculateMonthly(Number(emp.salary), newD, newH).ratePerDay
                    : RateCalculator.calculateAnnual(Number(emp.salary), newH).ratePerDay)
                : oldRates.ratePerDay,
              newH
            )
          : oldRates.ratePerHour,
      };

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position,
        calculationMethod: emp.calculationMethod,
        salary: Number(emp.salary),
        oldRatePerDay: oldRates.ratePerDay,
        newRatePerDay: newRates.ratePerDay,
        oldRatePerHour: oldRates.ratePerHour,
        newRatePerHour: newRates.ratePerHour,
        dayRateChanged: oldRates.ratePerDay !== newRates.ratePerDay,
        hourRateChanged: oldRates.ratePerHour !== newRates.ratePerHour,
      };
    });

    return {
      hasChanges: true,
      currentSettings: { workingDaysPerMonth: currentD, workingHoursPerDay: currentH },
      newSettings: { workingDaysPerMonth: newD, workingHoursPerDay: newH },
      affectedEmployeeCount: affectedEmployees.length,
      employees: affectedEmployees,
      formulaDescription: {
        before: `Rate/Day = ${currentD === 22 ? 'Salary ÷ 22' : `Salary ÷ ${currentD}`} (for Monthly method) | Rate/Day = (Salary × 12) ÷ 313 (for Annual method)`,
        after: `Rate/Day = ${newD === 22 ? 'Salary ÷ 22' : `Salary ÷ ${newD}`} (for Monthly method) | Rate/Day = (Salary × 12) ÷ 313 (for Annual method)`,
      },
    };
  }

  async updatePayrollSettings(id: number, data: { workingDaysPerMonth: number; workingHoursPerDay: number }) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        employees: {
          where: { isActive: true },
          select: { id: true, calculationMethod: true, salary: true },
        },
      },
    });
    if (!branch) throw new NotFoundError('Branch', id);

    const newD = data.workingDaysPerMonth;
    const newH = data.workingHoursPerDay;

    // Apply settings change and recalculate employee rates
    await prisma.branch.update({
      where: { id },
      data: { workingDaysPerMonth: newD, workingHoursPerDay: newH },
    });

    for (const emp of branch.employees) {
      const rates = RateCalculator.calculateEmployeeRates(
        Number(emp.salary),
        emp.calculationMethod as 'MONTHLY' | 'ANNUAL',
        newD,
        newH
      );
      await prisma.employee.update({
        where: { id: emp.id },
        data: { ratePerDay: rates.ratePerDay, ratePerHour: rates.ratePerHour },
      });
    }

    return {
      message: 'Payroll settings updated successfully',
      affectedEmployees: branch.employees.length,
      newSettings: { workingDaysPerMonth: newD, workingHoursPerDay: newH },
    };
  }

  async deactivate(id: number) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { employees: { where: { isActive: true } } } } },
    });
    if (!branch) throw new NotFoundError('Branch', id);

    if (branch._count.employees > 0) {
      throw new ValidationError(
        `Cannot deactivate branch with ${branch._count.employees} active employees. Transfer or deactivate employees first.`
      );
    }

    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    return { message: 'Branch deactivated successfully' };
  }

  async reactivate(id: number) {
    await prisma.branch.update({ where: { id }, data: { isActive: true } });
    return { message: 'Branch reactivated successfully' };
  }
}
