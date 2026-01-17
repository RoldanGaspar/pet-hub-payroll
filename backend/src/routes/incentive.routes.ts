import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import {
  DEFAULT_INCENTIVE_CONFIG,
  getIncentiveTypesForPosition,
  calculateIncentive,
  FormulaType,
} from '../utils/payrollCalculations';
import { PositionType } from '@prisma/client';

const router = Router();

// ============== INCENTIVE CONFIG ENDPOINTS ==============

// Get all incentive configurations
router.get('/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // First try to get from database
    let configs = await prisma.incentiveConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // If no configs in DB, return defaults
    if (configs.length === 0) {
      return res.json(DEFAULT_INCENTIVE_CONFIG);
    }

    return res.json(configs);
  } catch (error) {
    console.error('Get incentive configs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get incentive types available for a specific position
router.get('/config/position/:position', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const position = req.params.position as PositionType;
    
    // Get configs from DB or use defaults
    let configs = await prisma.incentiveConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (configs.length === 0) {
      // Use defaults filtered by position
      const filtered = getIncentiveTypesForPosition(position);
      return res.json(filtered);
    }

    // Filter by position
    const filtered = configs.filter((config) =>
      config.positions.includes(position)
    );

    return res.json(filtered);
  } catch (error) {
    console.error('Get position incentive configs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update incentive configuration (admin only)
router.put('/config/:type', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const type = req.params.type as string;
    const { rate, name, description, positions, isActive } = req.body;

    // Upsert the config
    const config = await prisma.incentiveConfig.upsert({
      where: { type },
      update: {
        rate: rate !== undefined ? rate : undefined,
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        positions: positions !== undefined ? positions : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      create: {
        type,
        name: name || type,
        rate: rate || 0,
        formulaType: 'COUNT_MULTIPLY',
        description: description || '',
        positions: positions || [],
        isActive: isActive ?? true,
        sortOrder: 99,
      },
    });

    return res.json(config);
  } catch (error) {
    console.error('Update incentive config error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize incentive configs from defaults (admin only)
router.post('/config/init', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    // Check if configs already exist
    const existing = await prisma.incentiveConfig.count();
    if (existing > 0) {
      return res.status(400).json({ error: 'Configs already initialized' });
    }

    // Create all default configs
    await prisma.incentiveConfig.createMany({
      data: DEFAULT_INCENTIVE_CONFIG.map((config) => ({
        type: config.type,
        name: config.name,
        rate: config.rate,
        formulaType: config.formulaType,
        description: config.description,
        positions: config.positions,
        isActive: true,
        sortOrder: config.sortOrder,
      })),
    });

    const configs = await prisma.incentiveConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return res.json(configs);
  } catch (error) {
    console.error('Init incentive configs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============== INCENTIVE CRUD ENDPOINTS ==============

// Get incentives for a payroll
router.get('/payroll/:payrollId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const payrollId = req.params.payrollId as string;

    const incentives = await prisma.incentive.findMany({
      where: { payrollId: parseInt(payrollId) },
      orderBy: { type: 'asc' },
    });

    return res.json(incentives);
  } catch (error) {
    console.error('Get incentives error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update incentive
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { payrollId, type, count, inputValue, rate, dateEarned } = req.body;

    // Get the config for this type
    let config = await prisma.incentiveConfig.findUnique({
      where: { type },
    });

    // Fall back to default config
    if (!config) {
      const defaultConfig = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === type);
      if (defaultConfig) {
        config = {
          ...defaultConfig,
          id: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      }
    }

    const effectiveRate = rate ?? config?.rate ?? 0;
    const formulaType = config?.formulaType || 'COUNT_MULTIPLY';

    // Calculate the incentive
    const result = calculateIncentive({
      type,
      count: count || 0,
      inputValue: inputValue || 0,
      rate: effectiveRate,
      formulaType: formulaType as FormulaType,
    });

    // Check if incentive already exists for this payroll and type
    const existing = await prisma.incentive.findFirst({
      where: {
        payrollId: parseInt(payrollId),
        type,
      },
    });

    let incentive;
    if (existing) {
      incentive = await prisma.incentive.update({
        where: { id: existing.id },
        data: {
          count: count ?? existing.count,
          inputValue: inputValue ?? existing.inputValue,
          rate: effectiveRate,
          amount: result.amount,
          formula: result.formula,
          dateEarned: dateEarned ? new Date(dateEarned) : existing.dateEarned,
        },
      });
    } else {
      incentive = await prisma.incentive.create({
        data: {
          payrollId: parseInt(payrollId),
          type,
          count: count || 0,
          inputValue: inputValue || 0,
          rate: effectiveRate,
          amount: result.amount,
          formula: result.formula,
          dateEarned: dateEarned ? new Date(dateEarned) : null,
        },
      });
    }

    // Recalculate payroll totals
    await recalculatePayrollTotals(parseInt(payrollId));

    return res.json(incentive);
  } catch (error) {
    console.error('Create incentive error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update incentives for a payroll
router.put('/payroll/:payrollId/bulk', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const payrollId = parseInt(req.params.payrollId as string);
    const { incentives } = req.body;

    // Get payroll with employee to know their position
    const payroll = await prisma.payrollPeriod.findUnique({
      where: { id: payrollId },
      include: { employee: true },
    });

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Delete existing incentives
    await prisma.incentive.deleteMany({
      where: { payrollId },
    });

    // Get all configs
    const configs = await prisma.incentiveConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.type, c]));

    // Create new incentives with calculations
    const incentiveData = [];
    for (const inc of incentives || []) {
      // Get config for this type
      let config = configMap.get(inc.type);
      if (!config) {
        const defaultConfig = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === inc.type);
        if (defaultConfig) {
          config = {
            ...defaultConfig,
            id: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any;
        }
      }

      const effectiveRate = inc.rate ?? config?.rate ?? 0;
      const formulaType = config?.formulaType || 'COUNT_MULTIPLY';

      const result = calculateIncentive({
        type: inc.type,
        count: inc.count || 0,
        inputValue: inc.inputValue || 0,
        rate: effectiveRate,
        formulaType: formulaType as FormulaType,
      });

      // Only add if there's actual input
      if (inc.count > 0 || inc.inputValue > 0) {
        incentiveData.push({
          payrollId,
          type: inc.type,
          count: inc.count || 0,
          inputValue: inc.inputValue || 0,
          rate: effectiveRate,
          amount: result.amount,
          formula: result.formula,
          dateEarned: inc.dateEarned ? new Date(inc.dateEarned) : null,
        });
      }
    }

    if (incentiveData.length > 0) {
      await prisma.incentive.createMany({
        data: incentiveData,
      });
    }

    // Recalculate payroll totals
    await recalculatePayrollTotals(payrollId);

    // Return updated payroll with incentives
    const updatedPayroll = await prisma.payrollPeriod.findUnique({
      where: { id: payrollId },
      include: {
        employee: true,
        incentives: { orderBy: { type: 'asc' } },
        deductions: true,
      },
    });

    return res.json(updatedPayroll);
  } catch (error) {
    console.error('Bulk update incentives error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate incentives preview (without saving)
router.post('/calculate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { position, incentives } = req.body;

    // Get all configs
    const configs = await prisma.incentiveConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.type, c]));

    const results = [];
    let totalCount = 0;
    let totalAmount = 0;

    for (const inc of incentives || []) {
      // Get config for this type
      let config = configMap.get(inc.type);
      if (!config) {
        const defaultConfig = DEFAULT_INCENTIVE_CONFIG.find((c) => c.type === inc.type);
        if (defaultConfig) {
          config = {
            ...defaultConfig,
            id: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any;
        }
      }

      const effectiveRate = inc.rate ?? config?.rate ?? 0;
      const formulaType = config?.formulaType || 'COUNT_MULTIPLY';

      const result = calculateIncentive({
        type: inc.type,
        count: inc.count || 0,
        inputValue: inc.inputValue || 0,
        rate: effectiveRate,
        formulaType: formulaType as FormulaType,
      });

      if (formulaType === 'COUNT_MULTIPLY') {
        totalCount += inc.count || 0;
      }
      totalAmount += result.amount;

      results.push({
        type: inc.type,
        name: config?.name || inc.type,
        count: inc.count || 0,
        inputValue: inc.inputValue || 0,
        rate: effectiveRate,
        formulaType,
        amount: result.amount,
        formula: result.formula,
      });
    }

    return res.json({
      incentives: results,
      totalCount,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  } catch (error) {
    console.error('Calculate incentives error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete incentive
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const incentive = await prisma.incentive.delete({
      where: { id: parseInt(id) },
    });

    // Recalculate payroll totals
    await recalculatePayrollTotals(incentive.payrollId);

    return res.json({ message: 'Incentive deleted successfully' });
  } catch (error) {
    console.error('Delete incentive error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to recalculate payroll totals
async function recalculatePayrollTotals(payrollId: number) {
  const allIncentives = await prisma.incentive.findMany({
    where: { payrollId },
  });
  const totalIncentives = allIncentives.reduce((sum, i) => sum + Number(i.amount), 0);

  const payroll = await prisma.payrollPeriod.findUnique({
    where: { id: payrollId },
    include: { employee: true },
  });

  if (!payroll) return;

  const allDeductions = await prisma.deduction.findMany({
    where: { payrollId },
  });
  const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

  const ratePerDay = Number(payroll.employee.ratePerDay);
  const ratePerHour = Number(payroll.employee.ratePerHour);

  const basicPay = ratePerDay * payroll.totalDaysPresent;
  const holidayPay = ratePerDay * Number(payroll.holidayRate) * payroll.holidays;
  const overtimePay = ratePerHour * 1.25 * Number(payroll.overtimeHours);
  const lateDeduction = ratePerHour * (Number(payroll.lateMinutes) / 60);

  const grossPay =
    basicPay +
    holidayPay +
    overtimePay +
    totalIncentives +
    Number(payroll.mealAllowance) +
    Number(payroll.silPay) +
    Number(payroll.birthdayLeave);

  const netPay = grossPay - totalDeductions - lateDeduction;

  await prisma.payrollPeriod.update({
    where: { id: payrollId },
    data: {
      totalIncentives,
      totalDeductions,
      basicPay: Math.round(basicPay * 100) / 100,
      holidayPay: Math.round(holidayPay * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    },
  });
}

export default router;
