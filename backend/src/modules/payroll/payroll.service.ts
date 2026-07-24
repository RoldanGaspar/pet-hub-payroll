import prisma from '../../shared/database/prisma';
import { TxClient } from '../../shared/types/common.types';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { PayrollCalculator } from './calculators/payroll.calculator';
import { RecalculationService } from './calculators/recalculation.service';
import { MonetaryRules } from '../../shared/utils/monetary.utils';
import { assertPayrollEditable, isPayrollLocked } from './payroll-lock';

interface CreatePeriodInput {
  branchId: number;
  startDate: string;
  endDate: string;
  workingDays?: number;
}

interface UpdatePayrollInput {
  workingDays?: number;
  dayOff?: number;
  absences?: number;
  totalDaysPresent?: number;
  holidays?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  mealAllowance?: number;
  silPay?: number;
  birthdayLeave?: number;
}

interface PayrollFilters {
  branchId?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export class PayrollService {
  private recalculationService = new RecalculationService();

  async getAll(filters: PayrollFilters) {
    const { branchId, startDate, endDate, status } = filters;

    const where: any = {};

    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate) };
      where.endDate = { lte: new Date(endDate) };
    }

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.employee = { branchId };
    }

    return prisma.payrollPeriod.findMany({
      where,
      include: {
        employee: {
          include: {
            branch: true,
            fixedDeductions: { where: { isActive: true } },
          },
        },
        incentives: true,
        deductions: true,
      },
      orderBy: [{ startDate: 'desc' }, { employee: { name: 'asc' } }],
    });
  }

  async getById(id: number) {
    const payroll = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            branch: true,
            fixedDeductions: { where: { isActive: true } },
          },
        },
        incentives: true,
        deductions: true,
      },
    });

    if (!payroll) throw new NotFoundError('PayrollPeriod', id);
    return payroll;
  }

  async createPeriod(input: CreatePeriodInput, tx?: TxClient) {
    const db = tx || prisma;
    const { branchId, startDate, endDate, workingDays } = input;

    const employees = await db.employee.findMany({
      where: { branchId, isActive: true },
      include: { fixedDeductions: true },
    });

    const payrolls = await Promise.all(
      employees.map(async (employee) => {
        const existing = await db.payrollPeriod.findFirst({
          where: {
            employeeId: employee.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
        });

        if (existing) return existing;

        const divisor = 2;
        const newPayroll = await db.payrollPeriod.create({
          data: {
            employeeId: employee.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            workingDays: workingDays || 15,
            totalDaysPresent: workingDays || 15,
            deductionDivisor: divisor,
            status: 'DRAFT',
          },
          include: {
            employee: { include: { branch: true } },
            incentives: true,
            deductions: true,
          },
        });

        if (employee.fixedDeductions && employee.fixedDeductions.length > 0) {
          const activeFixedDeductions = employee.fixedDeductions.filter((fd) => fd.isActive);

          for (const fd of activeFixedDeductions) {
            const dividedAmount = MonetaryRules.round(MonetaryRules.fromDecimal(fd.amount) / divisor);

            await db.deduction.create({
              data: {
                payrollId: newPayroll.id,
                type: fd.type,
                amount: dividedAmount,
              },
            });
          }

          const allDeductions = await db.deduction.findMany({
            where: { payrollId: newPayroll.id },
          });
          const totalDeductions = allDeductions.reduce((sum, d) => sum + MonetaryRules.fromDecimal(d.amount), 0);

          await db.payrollPeriod.update({
            where: { id: newPayroll.id },
            data: { totalDeductions },
          });
        }

        return db.payrollPeriod.findUnique({
          where: { id: newPayroll.id },
          include: {
            employee: { include: { branch: true } },
            incentives: true,
            deductions: true,
          },
        });
      })
    );

    return payrolls;
  }

  async updatePayroll(id: number, data: UpdatePayrollInput, tx?: TxClient) {
    const db = tx || prisma;

    const existing = await db.payrollPeriod.findUnique({
      where: { id },
      include: { employee: true, incentives: true, deductions: true },
    });

    if (!existing) throw new NotFoundError('PayrollPeriod', id);
    assertPayrollEditable(existing);

    const totalIncentives = existing.incentives.reduce((sum, i) => sum + MonetaryRules.fromDecimal(i.amount), 0);
    const totalDeductions = existing.deductions.reduce((sum, d) => sum + MonetaryRules.fromDecimal(d.amount), 0);

    const calculatedDaysPresent =
      data.totalDaysPresent ??
      (data.workingDays ?? existing.workingDays) -
        (data.dayOff ?? existing.dayOff) -
        (data.absences ?? existing.absences);

    const calculation = PayrollCalculator.calculate({
      salary: MonetaryRules.fromDecimal(existing.employee.salary),
      ratePerDay: MonetaryRules.fromDecimal(existing.employee.ratePerDay),
      ratePerHour: MonetaryRules.fromDecimal(existing.employee.ratePerHour),
      workingDays: data.workingDays ?? existing.workingDays,
      totalDaysPresent: calculatedDaysPresent,
      holidays: data.holidays !== undefined ? data.holidays : MonetaryRules.fromDecimal(existing.holidays),
      overtimeHours: data.overtimeHours ?? MonetaryRules.fromDecimal(existing.overtimeHours),
      lateMinutes: data.lateMinutes ?? MonetaryRules.fromDecimal(existing.lateMinutes),
      mealAllowance: data.mealAllowance ?? MonetaryRules.fromDecimal(existing.mealAllowance),
      silPay: data.silPay ?? MonetaryRules.fromDecimal(existing.silPay),
      birthdayLeave: data.birthdayLeave ?? MonetaryRules.fromDecimal(existing.birthdayLeave),
      totalIncentives,
      totalDeductions,
    });

    return db.payrollPeriod.update({
      where: { id },
      data: {
        workingDays: data.workingDays ?? existing.workingDays,
        dayOff: data.dayOff ?? existing.dayOff,
        absences: data.absences ?? existing.absences,
        totalDaysPresent: calculatedDaysPresent,
        holidays: data.holidays !== undefined ? data.holidays : existing.holidays,
        overtimeHours: data.overtimeHours ?? existing.overtimeHours,
        lateMinutes: data.lateMinutes ?? existing.lateMinutes,
        mealAllowance: data.mealAllowance ?? existing.mealAllowance,
        silPay: data.silPay ?? existing.silPay,
        birthdayLeave: data.birthdayLeave ?? existing.birthdayLeave,
        basicPay: calculation.basicPay,
        holidayPay: calculation.holidayPay,
        overtimePay: calculation.overtimePay,
        totalIncentives,
        grossPay: calculation.grossPay,
        totalDeductions,
        netPay: calculation.netPay,
        status: existing.status,
      },
      include: {
        employee: { include: { branch: true } },
        incentives: true,
        deductions: true,
      },
    });
  }

  async calculate(id: number, tx?: TxClient) {
    const db = tx || prisma;
    const payroll = await db.payrollPeriod.findUnique({ where: { id }, select: { id: true, status: true } });
    assertPayrollEditable(payroll);
    await this.recalculationService.recalculate(id, tx);
    return this.getById(id);
  }

  async deletePayroll(id: number, tx?: TxClient) {
    const db = tx || prisma;
    const payroll = await db.payrollPeriod.findUnique({ where: { id }, select: { id: true, status: true } });
    assertPayrollEditable(payroll);
    await db.payrollPeriod.delete({ where: { id } });
    return { message: 'Payroll deleted successfully' };
  }

  async calculateBatch(ids: number[]) {
    const payrolls = await prisma.payrollPeriod.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    const foundIds = new Set(payrolls.map((payroll) => payroll.id));
    const skippedIds = ids.filter((id) => !foundIds.has(id) || isPayrollLocked(payrolls.find((payroll) => payroll.id === id)?.status || ''));
    const updatedIds = payrolls.filter((payroll) => !isPayrollLocked(payroll.status)).map((payroll) => payroll.id);

    for (const id of updatedIds) await this.calculate(id);
    return { updatedIds, skippedIds };
  }

  async approveBatch(ids: number[]) {
    const payrolls = await prisma.payrollPeriod.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    const approvableIds = payrolls
      .filter((payroll) => payroll.status === 'DRAFT' || payroll.status === 'PENDING')
      .map((payroll) => payroll.id);
    const skippedIds = ids.filter((id) => !approvableIds.includes(id));

    if (approvableIds.length) {
      await prisma.payrollPeriod.updateMany({
        where: { id: { in: approvableIds } },
        data: { status: 'APPROVED' },
      });
    }
    return { updatedIds: approvableIds, skippedIds };
  }

  async reopenPayroll(id: number) {
    const payroll = await prisma.payrollPeriod.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!payroll) throw new NotFoundError('PayrollPeriod', id);
    if (!isPayrollLocked(payroll.status)) {
      throw new ConflictError('Only approved or paid payrolls can be re-opened.');
    }
    return prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }
}
