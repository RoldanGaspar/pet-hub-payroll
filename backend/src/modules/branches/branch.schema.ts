import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  address: z.string().min(1, 'Address is required'),
  contact: z.string().optional(),
  type: z.enum(['VETERINARY_CLINIC', 'VETERINARY_HOSPITAL', 'TRADING']).default('VETERINARY_CLINIC'),
  workingDaysPerMonth: z.number().int().min(1).max(31).default(22),
  workingHoursPerDay: z.number().int().min(1).max(24).default(8),
});

export const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  contact: z.string().optional(),
  type: z.enum(['VETERINARY_CLINIC', 'VETERINARY_HOSPITAL', 'TRADING']).optional(),
  isActive: z.boolean().optional(),
});

export const payrollSettingsSchema = z.object({
  workingDaysPerMonth: z.number().int().min(1).max(31),
  workingHoursPerDay: z.number().int().min(1).max(24),
});

export const branchQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(['VETERINARY_CLINIC', 'VETERINARY_HOSPITAL', 'TRADING']).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  sort: z.enum(['name', 'employeeCount']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
