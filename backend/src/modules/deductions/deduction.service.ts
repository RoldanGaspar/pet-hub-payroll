import prisma from '../../shared/database/prisma';
import { TxClient } from '../../shared/types/common.types';
import { NotFoundError } from '../../shared/errors';
import { RecalculationService } from '../payroll/calculators/recalculation.service';
import { MonetaryRules } from '../../shared/utils/monetary.utils';
import { assertPayrollEditable } from '../payroll/payroll-lock';

export class DeductionService {
  private recalculationService = new RecalculationService();

  private async assertEditable(payrollId: number, db: TxClient | typeof prisma = prisma) {
    const payroll = await db.payrollPeriod.findUnique({ where: { id: payrollId }, select: { id: true, status: true } });
    assertPayrollEditable(payroll);
  }

  async getByPayroll(payrollId: number) {
    return prisma.deduction.findMany({ where: { payrollId }, orderBy: { type: 'asc' } });
  }

  async create(payrollId: number, type: string, amount: number, notes?: string, tx?: TxClient) {
    const db = tx || prisma;
    await this.assertEditable(payrollId, db);
    const existing = await db.deduction.findFirst({ where: { payrollId, type } });
    let deduction;
    if (existing) {
      deduction = await db.deduction.update({ where: { id: existing.id }, data: { amount: amount ?? existing.amount, notes: notes ?? existing.notes } });
    } else {
      deduction = await db.deduction.create({ data: { payrollId, type, amount: amount || 0, notes } });
    }
    await this.recalculationService.recalculate(payrollId, tx);
    return deduction;
  }

  async bulkUpdate(payrollId: number, deductions: any[], tx?: TxClient) {
    const db = tx || prisma;
    await this.assertEditable(payrollId, db);
    await db.deduction.deleteMany({ where: { payrollId } });
    if (deductions && deductions.length > 0) {
      await db.deduction.createMany({ data: deductions.map((d: any) => ({ payrollId, type: d.type, amount: d.amount || 0, notes: d.notes })) });
    }
    await this.recalculationService.recalculate(payrollId, tx);
    return db.payrollPeriod.findUnique({ where: { id: payrollId }, include: { deductions: true } });
  }

  async applyFixed(payrollId: number, tx?: TxClient) {
    const db = tx || prisma;
    const payroll = await db.payrollPeriod.findUnique({
      where: { id: payrollId },
      include: { employee: { include: { fixedDeductions: { where: { isActive: true } } } } },
    });
    if (!payroll) throw new NotFoundError('PayrollPeriod', payrollId);
    assertPayrollEditable(payroll);

    const divisor = payroll.deductionDivisor || 2;
    await db.deduction.deleteMany({ where: { payrollId } });
    for (const fd of payroll.employee.fixedDeductions) {
      const dividedAmount = MonetaryRules.round(MonetaryRules.fromDecimal(fd.amount) / divisor);
      await db.deduction.create({ data: { payrollId, type: fd.type, amount: dividedAmount } });
    }
    await this.recalculationService.recalculate(payrollId, tx);
    return db.payrollPeriod.findUnique({ where: { id: payrollId }, include: { deductions: true } });
  }

  async updateDivisor(payrollId: number, divisor: number) {
    if (!divisor || divisor < 1) throw new Error('Divisor must be at least 1');
    await this.assertEditable(payrollId);
    return prisma.payrollPeriod.update({ where: { id: payrollId }, data: { deductionDivisor: divisor } });
  }

  async delete(id: number, tx?: TxClient) {
    const db = tx || prisma;
    const existing = await db.deduction.findUnique({ where: { id }, select: { payrollId: true } });
    if (!existing) throw new NotFoundError('Deduction', id);
    await this.assertEditable(existing.payrollId, db);
    const deduction = await db.deduction.delete({ where: { id } });
    await this.recalculationService.recalculate(deduction.payrollId, tx);
    return { message: 'Deduction deleted successfully' };
  }
}
