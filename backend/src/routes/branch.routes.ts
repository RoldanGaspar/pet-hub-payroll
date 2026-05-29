import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { calculateEmployeeRates, DEFAULT_WORKING_DAYS_PER_MONTH, DEFAULT_WORKING_HOURS_PER_DAY } from '../utils/payrollCalculations';
import { RateCalculationMethod } from '@prisma/client';

const router = Router();

// Get all branches
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get branch by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
      include: {
        employees: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    return res.json(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create branch
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, address, contact, type, workingDaysPerMonth, workingHoursPerDay } = req.body;

    const branch = await prisma.branch.create({
      data: {
        name,
        address,
        contact,
        type: type || 'VETERINARY_CLINIC',
        workingDaysPerMonth: workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH,
        workingHoursPerDay: workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY,
      },
    });

    return res.status(201).json(branch);
  } catch (error) {
    console.error('Create branch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update branch
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { name, address, contact, type, isActive, workingDaysPerMonth, workingHoursPerDay } = req.body;

    // Get current branch to check if D or H changed
    const currentBranch = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
    });

    if (!currentBranch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const newWorkingDaysPerMonth = workingDaysPerMonth ?? currentBranch.workingDaysPerMonth;
    const newWorkingHoursPerDay = workingHoursPerDay ?? currentBranch.workingHoursPerDay;

    // Check if D or H changed
    const rateSettingsChanged = 
      newWorkingDaysPerMonth !== currentBranch.workingDaysPerMonth ||
      newWorkingHoursPerDay !== currentBranch.workingHoursPerDay;

    const branch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        contact,
        type,
        isActive,
        workingDaysPerMonth: newWorkingDaysPerMonth,
        workingHoursPerDay: newWorkingHoursPerDay,
      },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    // If D or H changed, recalculate rates for ALL employees in this branch
    // Both MONTHLY and ANNUAL formulas use H (working hours per day) for Rate/Hour
    // MONTHLY also uses D (working days per month) for Rate/Day
    if (rateSettingsChanged) {
      const employees = await prisma.employee.findMany({
        where: { branchId: parseInt(id), isActive: true },
      });

      let recalculatedCount = 0;
      for (const employee of employees) {
        const { ratePerDay, ratePerHour } = calculateEmployeeRates(
          Number(employee.salary),
          employee.calculationMethod as 'MONTHLY' | 'ANNUAL',
          newWorkingDaysPerMonth,
          newWorkingHoursPerDay
        );

        await prisma.employee.update({
          where: { id: employee.id },
          data: { ratePerDay, ratePerHour },
        });
        recalculatedCount++;
      }

      console.log(`Recalculated rates for ${recalculatedCount} employee(s) in branch ${branch.name}`);
    }

    return res.json(branch);
  } catch (error) {
    console.error('Update branch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete branch (soft delete)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.branch.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
