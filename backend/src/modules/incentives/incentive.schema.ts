import { z } from 'zod';

export const createIncentiveSchema = z.object({
  payrollId: z.number().int().positive(),
  type: z.string().min(1),
  count: z.number().min(0).optional(),
  inputValue: z.number().min(0).optional(),
  rate: z.number().min(0).optional(),
  dateEarned: z.string().optional(),
});

export const bulkUpdateSchema = z.object({
  incentives: z.array(z.object({
    type: z.string(),
    count: z.number().min(0).optional(),
    inputValue: z.number().min(0).optional(),
    rate: z.number().min(0).optional(),
    dateEarned: z.string().optional(),
  })),
});

export const calculatePreviewSchema = z.object({
  position: z.string(),
  incentives: z.array(z.object({
    type: z.string(),
    count: z.number().min(0).optional(),
    inputValue: z.number().min(0).optional(),
  })),
});

export const updateConfigSchema = z.object({
  rate: z.number().min(0).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  positions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
