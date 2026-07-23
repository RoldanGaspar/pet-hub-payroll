import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

async function recalculatePayrollTotals(payrollId: number) {
  const service = new (await import('../modules/payroll/calculators/recalculation.service')).RecalculationService();
  await service.recalculate(payrollId);
}

// Get deductions for a payroll
router.get('/payroll/:payrollId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const payrollId = req.params.payrollId as string;

    const deductions = await prisma.deduction.findMany({
      where: { payrollId: parseInt(payrollId) },
      orderBy: { type: 'asc' },
    });

    return res.json(deductions);
  } catch (error) {
    console.error('Get deductions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update deduction
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { payrollId, type, amount, notes } = req.body;

    // Check if deduction already exists for this payroll and type
    const existing = await prisma.deduction.findFirst({
      where: {
        payrollId: parseInt(payrollId),
        type,
      },
    });

    let deduction;

    if (existing) {
      deduction = await prisma.deduction.update({
        where: { id: existing.id },
        data: {
          amount: amount ?? existing.amount,
          notes: notes ?? existing.notes,
        },
      });
    } else {
      deduction = await prisma.deduction.create({
        data: {
          payrollId: parseInt(payrollId),
          type,
          amount: amount || 0,
          notes,
        },
      });
    }

    // Recalculate all payroll values using centralized service
    await recalculatePayrollTotals(parseInt(payrollId));

    const updated = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(payrollId) },
      include: {
        employee: true,
        incentives: true,
        deductions: true,
      },
    });

    return res.json(updated);

  } catch (error) {
    console.error('Create deduction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update deductions (typically from fixed deductions)
router.post('/bulk', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { payrollId, deductions } = req.body;

    // Delete existing deductions
    await prisma.deduction.deleteMany({
      where: { payrollId: parseInt(payrollId) },
    });

    // Create new deductions
    if (deductions && deductions.length > 0) {
      await prisma.deduction.createMany({
        data: deductions.map((d: any) => ({
          payrollId: parseInt(payrollId),
          type: d.type,
          amount: d.amount || 0,
          notes: d.notes,
        })),
      });
    }

    // Recalculate using centralized service
    await recalculatePayrollTotals(parseInt(payrollId));

    const updatedPayroll = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(payrollId) },
      include: { deductions: true },
    });

    if (updatedPayroll) {
      return res.json(updatedPayroll);
    }

    return res.status(404).json({ error: 'Payroll not found' });
  } catch (error) {
    console.error('Bulk update deductions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply fixed deductions to payroll (divided by deductionDivisor)
router.post('/apply-fixed/:payrollId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const payrollId = req.params.payrollId as string;

    const payroll = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(payrollId) },
      include: {
        employee: {
          include: { fixedDeductions: { where: { isActive: true } } },
        },
      },
    });

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    const divisor = payroll.deductionDivisor || 2;

    // Delete existing deductions and replace with employee's fixed deductions ÷ divisor
    await prisma.deduction.deleteMany({
      where: { payrollId: parseInt(payrollId) },
    });

    // Create deductions from employee's fixed deductions, divided by divisor
    for (const fd of payroll.employee.fixedDeductions) {
      const dividedAmount = Number(fd.amount) / divisor;
      // Round to 2 decimal places
      const roundedAmount = Math.round(dividedAmount * 100) / 100;
      
      await prisma.deduction.create({
        data: {
          payrollId: parseInt(payrollId),
          type: fd.type,
          amount: roundedAmount,
        },
      });
    }

    // Recalculate using centralized service
    await recalculatePayrollTotals(parseInt(payrollId));

    const updated = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(payrollId) },
      include: { deductions: true },
    });

    if (!updated) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Apply fixed deductions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update deduction divisor for a payroll
router.put('/divisor/:payrollId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const payrollId = req.params.payrollId as string;
    const { divisor } = req.body;

    if (!divisor || divisor < 1) {
      return res.status(400).json({ error: 'Divisor must be at least 1' });
    }

    const payroll = await prisma.payrollPeriod.update({
      where: { id: parseInt(payrollId) },
      data: { deductionDivisor: divisor },
    });

    return res.json(payroll);
  } catch (error) {
    console.error('Update divisor error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete deduction
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const deduction = await prisma.deduction.delete({
      where: { id: parseInt(id) },
    });

    // Recalculate using centralized service
    await recalculatePayrollTotals(deduction.payrollId);

    return res.json({ message: 'Deduction deleted successfully' });
  } catch (error) {
    console.error('Delete deduction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
