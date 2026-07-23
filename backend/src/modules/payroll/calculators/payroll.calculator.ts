import { MonetaryRules } from '../../../shared/utils/monetary.utils';

export interface PayrollCalculationInput {
  salary: number;
  ratePerDay: number;
  ratePerHour: number;
  workingDays: number;
  totalDaysPresent: number;
  holidays: number;
  overtimeHours: number;
  lateMinutes: number;
  mealAllowance: number;
  silPay: number;
  birthdayLeave: number;
  totalIncentives: number;
  totalDeductions: number;
}

export interface PayrollCalculationResult {
  basicPay: number;
  holidayPay: number;
  overtimePay: number;
  lateDeduction: number;
  grossPay: number;
  netPay: number;
}

export class PayrollCalculator {
  static calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    const basicPay = input.ratePerDay * input.totalDaysPresent;
    const holidayPayRaw = input.holidays * input.ratePerDay;
    const holidayPay = MonetaryRules.truncate(holidayPayRaw);
    const overtimePay = input.ratePerHour * input.overtimeHours;
    const lateDeduction = input.ratePerHour * (input.lateMinutes / 60);

    const grossPay =
      basicPay +
      holidayPay +
      overtimePay +
      input.totalIncentives +
      input.mealAllowance +
      input.silPay +
      input.birthdayLeave;

    const netPay = grossPay - input.totalDeductions - lateDeduction;

    return {
      basicPay: MonetaryRules.round(basicPay),
      holidayPay: holidayPay,
      overtimePay: MonetaryRules.round(overtimePay),
      lateDeduction: MonetaryRules.round(lateDeduction),
      grossPay: MonetaryRules.round(grossPay),
      netPay: MonetaryRules.truncate(netPay),
    };
  }
}
