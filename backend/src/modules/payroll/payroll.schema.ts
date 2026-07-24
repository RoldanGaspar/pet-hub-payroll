import { z } from 'zod';

export const createPeriodSchema = z.object({
  branchId: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string(),
  workingDays: z.number().int().min(1).max(31).optional(),
});

export const updatePayrollSchema = z.object({
  workingDays: z.number().int().min(0).optional(),
  dayOff: z.number().int().min(0).optional(),
  absences: z.number().int().min(0).optional(),
  totalDaysPresent: z.number().int().min(0).optional(),
  holidays: z.number().min(0).optional(),
  overtimeHours: z.number().min(0).optional(),
  lateMinutes: z.number().min(0).optional(),
  mealAllowance: z.number().min(0).optional(),
  silPay: z.number().min(0).optional(),
  birthdayLeave: z.number().min(0).optional(),
});

export const payrollIdsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});
