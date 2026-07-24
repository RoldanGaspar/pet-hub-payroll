import prisma from '../../../shared/database/prisma';
import { TxClient } from '../../../shared/types/common.types';
import { PayrollCalculator } from './payroll.calculator';
import { MonetaryRules } from '../../../shared/utils/monetary.utils';
import { assertPayrollEditable } from '../payroll-lock';

export class RecalculationService {
  async recalculate(payrollId: number, tx?: TxClient): Promise<void> {
    const db = tx || prisma;

    const payroll = await db.payrollPeriod.findUnique({
      where: { id: payrollId },
      include: {
        employee: { include: { fixedDeductions: { where: { isActive: true } } } },
        incentives: true,
        deductions: true,
      },
    });

    if (!payroll) return;
    assertPayrollEditable(payroll);

    const totalIncentives = payroll.incentives.reduce((sum, i) => sum + MonetaryRules.fromDecimal(i.amount), 0);
    const totalDeductions = payroll.deductions.reduce((sum, d) => sum + MonetaryRules.fromDecimal(d.amount), 0);

    const calculatedDaysPresent = payroll.workingDays - payroll.dayOff - payroll.absences;

    const calculation = PayrollCalculator.calculate({
      salary: MonetaryRules.fromDecimal(payroll.employee.salary),
      ratePerDay: MonetaryRules.fromDecimal(payroll.employee.ratePerDay),
      ratePerHour: MonetaryRules.fromDecimal(payroll.employee.ratePerHour),
      workingDays: payroll.workingDays,
      totalDaysPresent: calculatedDaysPresent,
      holidays: MonetaryRules.fromDecimal(payroll.holidays),
      overtimeHours: MonetaryRules.fromDecimal(payroll.overtimeHours),
      lateMinutes: MonetaryRules.fromDecimal(payroll.lateMinutes),
      mealAllowance: MonetaryRules.fromDecimal(payroll.mealAllowance),
      silPay: MonetaryRules.fromDecimal(payroll.silPay),
      birthdayLeave: MonetaryRules.fromDecimal(payroll.birthdayLeave),
      totalIncentives,
      totalDeductions,
    });

    await db.payrollPeriod.update({
      where: { id: payrollId },
      data: {
        totalDaysPresent: calculatedDaysPresent,
        totalIncentives,
        totalDeductions,
        basicPay: calculation.basicPay,
        holidayPay: calculation.holidayPay,
        overtimePay: calculation.overtimePay,
        grossPay: calculation.grossPay,
        netPay: calculation.netPay,
      },
    });
  }
}
