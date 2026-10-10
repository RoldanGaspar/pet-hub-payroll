import prisma from '../../shared/database/prisma';
import { TxClient } from '../../shared/types/common.types';
import { NotFoundError } from '../../shared/errors';
import { RecalculationService } from '../payroll/calculators/recalculation.service';
import { MonetaryRules } from '../../shared/utils/monetary.utils';
import { assertPayrollEditable } from '../payroll/payroll-lock';

export class CashAdvanceService {
  private recalculationService = new RecalculationService();

  async getAll(query?: { employeeId?: number; isPaid?: boolean; search?: string; branchId?: number }) {
    const where: any = {};
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.isPaid !== undefined) where.isPaid = query.isPaid;
    if (query?.branchId) {
      where.employee = { branchId: query.branchId };
    }
    if (query?.search) {
      const s = query.search;
      where.employee = { ...(where.employee || {}), name: { contains: s, mode: 'insensitive' } };
    }
    return prisma.cashAdvance.findMany({ where, include: { employee: { include: { branch: true } } }, orderBy: { dateTaken: 'desc' } });
  }

  async getById(id: number) {
    const ca = await prisma.cashAdvance.findUnique({ where: { id }, include: { employee: { include: { branch: true } } } });
    if (!ca) throw new NotFoundError('CashAdvance', id);
    return ca;
  }

  async create(employeeId: number, amount: number, dateTaken: string, notes?: string) {
    return prisma.cashAdvance.create({ data: { employeeId, amount, dateTaken: new Date(dateTaken), notes }, include: { employee: { include: { branch: true } } } });
  }

  async update(id: number, data: any) {
    return prisma.cashAdvance.update({ where: { id }, data: { amount: data.amount ? parseFloat(data.amount) : undefined, dateTaken: data.dateTaken ? new Date(data.dateTaken) : undefined, dateDeducted: data.dateDeducted ? new Date(data.dateDeducted) : undefined, isPaid: data.isPaid, notes: data.notes }, include: { employee: { include: { branch: true } } } });
  }

  async markPaid(id: number, payrollId?: number, tx?: TxClient) {
    const db = tx || prisma;
    if (payrollId) {
      const payroll = await db.payrollPeriod.findUnique({ where: { id: payrollId }, select: { id: true, status: true } });
      assertPayrollEditable(payroll, payrollId);
    }
    const ca = await db.cashAdvance.update({ where: { id }, data: { isPaid: true, dateDeducted: new Date() } });
    if (payrollId) {
      await db.deduction.create({ data: { payrollId, type: 'CASH_ADVANCE', amount: ca.amount, notes: `Cash advance from ${new Date(ca.dateTaken).toISOString().split('T')[0]}` } });
      await this.recalculationService.recalculate(payrollId, tx);
    }
    return ca;
  }

  async delete(id: number) {
    await prisma.cashAdvance.delete({ where: { id } });
    return { message: 'Cash advance deleted successfully' };
  }

  async getUnpaid(employeeId: number) {
    const cashAdvances = await prisma.cashAdvance.findMany({ where: { employeeId, isPaid: false }, orderBy: { dateTaken: 'asc' } });
    const total = cashAdvances.reduce((sum, ca) => sum + MonetaryRules.fromDecimal(ca.amount), 0);
    return { cashAdvances, total };
  }
}
