import prisma from '../../shared/database/prisma';
import { RateCalculator } from '../payroll/calculators/rate.calculator';

export class BranchService {
  async getAll() {
    return prisma.branch.findMany({ where: { isActive: true }, include: { _count: { select: { employees: true } } }, orderBy: { name: 'asc' } });
  }

  async getById(id: number) {
    return prisma.branch.findUnique({ where: { id }, include: { employees: { where: { isActive: true }, orderBy: { name: 'asc' } } } });
  }

  async create(data: any) {
    return prisma.branch.create({ data: { name: data.name, address: data.address, contact: data.contact, type: data.type || 'VETERINARY_CLINIC', workingDaysPerMonth: data.workingDaysPerMonth ?? 22, workingHoursPerDay: data.workingHoursPerDay ?? 8 } });
  }

  async update(id: number, data: any) {
    const current = await prisma.branch.findUnique({ where: { id } });
    if (!current) return null;
    const newD = data.workingDaysPerMonth ?? current.workingDaysPerMonth;
    const newH = data.workingHoursPerDay ?? current.workingHoursPerDay;
    const rateSettingsChanged = newD !== current.workingDaysPerMonth || newH !== current.workingHoursPerDay;

    const branch = await prisma.branch.update({
      where: { id }, data: { name: data.name, address: data.address, contact: data.contact, type: data.type, isActive: data.isActive, workingDaysPerMonth: newD, workingHoursPerDay: newH },
      include: { _count: { select: { employees: true } } },
    });

    if (rateSettingsChanged) {
      const employees = await prisma.employee.findMany({ where: { branchId: id, isActive: true } });
      for (const emp of employees) {
        const rates = RateCalculator.calculateEmployeeRates(Number(emp.salary), emp.calculationMethod as 'MONTHLY' | 'ANNUAL', newD, newH);
        await prisma.employee.update({ where: { id: emp.id }, data: { ratePerDay: rates.ratePerDay, ratePerHour: rates.ratePerHour } });
      }
    }
    return branch;
  }

  async softDelete(id: number) {
    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    return { message: 'Branch deleted successfully' };
  }
}
