import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

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

    // Recalculate payroll totals
    const allDeductions = await prisma.deduction.findMany({
      where: { payrollId: parseInt(payrollId) },
    });
    const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

    await prisma.payrollPeriod.update({
      where: { id: parseInt(payrollId) },
      data: { totalDeductions },
    });

    return res.json(deduction);
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

    // Recalculate payroll totals
    const allDeductions = await prisma.deduction.findMany({
      where: { payrollId: parseInt(payrollId) },
    });
    const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

    const payroll = await prisma.payrollPeriod.update({
      where: { id: parseInt(payrollId) },
      data: { totalDeductions },
      include: { deductions: true },
    });

    return res.json(payroll);
  } catch (error) {
    console.error('Bulk update deductions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply fixed deductions to payroll
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

    const existingDeductions = await prisma.deduction.findMany({
      where: { payrollId: parseInt(payrollId) },
    });

    const existingTypes = existingDeductions.map((d) => d.type);

    for (const fd of payroll.employee.fixedDeductions) {
      if (!existingTypes.includes(fd.type)) {
        await prisma.deduction.create({
          data: {
            payrollId: parseInt(payrollId),
            type: fd.type,
            amount: fd.amount,
          },
        });
      }
    }

    // Recalculate totals
    const allDeductions = await prisma.deduction.findMany({
      where: { payrollId: parseInt(payrollId) },
    });
    const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

    const updated = await prisma.payrollPeriod.update({
      where: { id: parseInt(payrollId) },
      data: { totalDeductions },
      include: { deductions: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Apply fixed deductions error:', error);
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

    // Recalculate payroll totals
    const allDeductions = await prisma.deduction.findMany({
      where: { payrollId: deduction.payrollId },
    });
    const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

    await prisma.payrollPeriod.update({
      where: { id: deduction.payrollId },
      data: { totalDeductions },
    });

    return res.json({ message: 'Deduction deleted successfully' });
  } catch (error) {
    console.error('Delete deduction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
