import { MonetaryRules } from '../../../shared/utils/monetary.utils';
import { PositionType } from '@prisma/client';

export const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
export const DEFAULT_WORKING_HOURS_PER_DAY = 8;
export const ANNUAL_WORKING_DAYS = 313;

export class RateCalculator {
  static calculateMonthly(
    monthlySalary: number,
    workingDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH,
    workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
  ): { ratePerDay: number; ratePerHour: number } {
    const ratePerDay = MonetaryRules.round(monthlySalary / workingDaysPerMonth);
    const ratePerHour = MonetaryRules.round(ratePerDay / workingHoursPerDay);
    return { ratePerDay, ratePerHour };
  }

  static calculateAnnual(
    monthlySalary: number,
    workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
  ): { ratePerDay: number; ratePerHour: number } {
    const annualSalary = monthlySalary * 12;
    const ratePerDay = MonetaryRules.round(annualSalary / ANNUAL_WORKING_DAYS);
    const ratePerHour = MonetaryRules.round(ratePerDay / workingHoursPerDay);
    return { ratePerDay, ratePerHour };
  }

  static calculateEmployeeRates(
    monthlySalary: number,
    calculationMethod: 'MONTHLY' | 'ANNUAL',
    workingDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH,
    workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
  ): { ratePerDay: number; ratePerHour: number } {
    if (calculationMethod === 'ANNUAL') {
      return this.calculateAnnual(monthlySalary, workingHoursPerDay);
    }
    return this.calculateMonthly(monthlySalary, workingDaysPerMonth, workingHoursPerDay);
  }

  static calculateRatePerDay(
    monthlySalary: number,
    workingDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH
  ): number {
    return MonetaryRules.roundToSix(monthlySalary / workingDaysPerMonth);
  }

  static calculateRatePerHour(
    ratePerDay: number,
    workingHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
  ): number {
    return MonetaryRules.roundToSix(ratePerDay / workingHoursPerDay);
  }

  static usesAnnualFormula(position: PositionType): boolean {
    return position !== PositionType.RESIDENT_VETERINARIAN;
  }

  static getDefaultCalculationMethod(position: PositionType): 'MONTHLY' | 'ANNUAL' {
    return position === PositionType.RESIDENT_VETERINARIAN ? 'MONTHLY' : 'ANNUAL';
  }
}
