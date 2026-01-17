import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all cash advances
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { employeeId, isPaid } = req.query;

    const where: any = {};

    if (employeeId) {
      where.employeeId = parseInt(employeeId as string);
    }

    if (isPaid !== undefined) {
      where.isPaid = isPaid === 'true';
    }

    const cashAdvances = await prisma.cashAdvance.findMany({
      where,
      include: {
        employee: {
          include: { branch: true },
        },
      },
      orderBy: { dateTaken: 'desc' },
    });

    return res.json(cashAdvances);
  } catch (error) {
    console.error('Get cash advances error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cash advance by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const cashAdvance = await prisma.cashAdvance.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: {
          include: { branch: true },
        },
      },
    });

    if (!cashAdvance) {
      return res.status(404).json({ error: 'Cash advance not found' });
    }

    return res.json(cashAdvance);
  } catch (error) {
    console.error('Get cash advance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create cash advance
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { employeeId, amount, dateTaken, notes } = req.body;

    const cashAdvance = await prisma.cashAdvance.create({
      data: {
        employeeId: parseInt(employeeId),
        amount: parseFloat(amount),
        dateTaken: new Date(dateTaken),
        notes,
      },
      include: {
        employee: {
          include: { branch: true },
        },
      },
    });

    return res.status(201).json(cashAdvance);
  } catch (error) {
    console.error('Create cash advance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cash advance
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { amount, dateTaken, dateDeducted, isPaid, notes } = req.body;

    const cashAdvance = await prisma.cashAdvance.update({
      where: { id: parseInt(id) },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        dateTaken: dateTaken ? new Date(dateTaken) : undefined,
        dateDeducted: dateDeducted ? new Date(dateDeducted) : undefined,
        isPaid,
        notes,
      },
      include: {
        employee: {
          include: { branch: true },
        },
      },
    });

    return res.json(cashAdvance);
  } catch (error) {
    console.error('Update cash advance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as paid
router.post('/:id/mark-paid', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { payrollId } = req.body;

    const cashAdvance = await prisma.cashAdvance.update({
      where: { id: parseInt(id) },
      data: {
        isPaid: true,
        dateDeducted: new Date(),
      },
    });

    // If payrollId is provided, add as deduction
    if (payrollId) {
      await prisma.deduction.create({
        data: {
          payrollId: parseInt(payrollId),
          type: 'CASH_ADVANCE',
          amount: cashAdvance.amount,
          notes: `Cash advance from ${cashAdvance.dateTaken.toISOString().split('T')[0]}`,
        },
      });

      // Recalculate payroll totals
      const allDeductions = await prisma.deduction.findMany({
        where: { payrollId: parseInt(payrollId) },
      });
      const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

      await prisma.payrollPeriod.update({
        where: { id: parseInt(payrollId) },
        data: { totalDeductions },
      });
    }

    return res.json(cashAdvance);
  } catch (error) {
    console.error('Mark paid error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete cash advance
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.cashAdvance.delete({
      where: { id: parseInt(id) },
    });

    return res.json({ message: 'Cash advance deleted successfully' });
  } catch (error) {
    console.error('Delete cash advance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unpaid cash advances for an employee
router.get('/employee/:employeeId/unpaid', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const employeeId = req.params.employeeId as string;

    const cashAdvances = await prisma.cashAdvance.findMany({
      where: {
        employeeId: parseInt(employeeId),
        isPaid: false,
      },
      orderBy: { dateTaken: 'asc' },
    });

    const total = cashAdvances.reduce((sum, ca) => sum + Number(ca.amount), 0);

    return res.json({
      cashAdvances,
      total,
    });
  } catch (error) {
    console.error('Get unpaid cash advances error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
