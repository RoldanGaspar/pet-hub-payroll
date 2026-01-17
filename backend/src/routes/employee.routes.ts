import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { calculateEmployeeRates, DEFAULT_WORKING_DAYS_PER_MONTH, DEFAULT_WORKING_HOURS_PER_DAY, usesAnnualFormula, getRateFormulaDescription } from '../utils/payrollCalculations';
import { PositionType } from '@prisma/client';

const router = Router();

// Get all employees
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { branchId } = req.query;

    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        branch: true,
        fixedDeductions: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        branch: true,
        fixedDeductions: true,
        cashAdvances: {
          where: { isPaid: false },
          orderBy: { dateTaken: 'desc' },
        },
        payrollPeriods: {
          orderBy: { startDate: 'desc' },
          take: 10,
          include: {
            incentives: true,
            deductions: true,
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get rate formula info for a position
router.get('/formula/:position', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const position = req.params.position as PositionType;
    const usesAnnual = usesAnnualFormula(position);
    const description = getRateFormulaDescription(position);
    
    return res.json({
      position,
      usesAnnualFormula: usesAnnual,
      formulaDescription: description,
    });
  } catch (error) {
    console.error('Get formula info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create employee
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      branchId,
      name,
      position,
      salary,
      ratePerDay: customRatePerDay,
      ratePerHour: customRatePerHour,
      address,
      sssNo,
      tinNo,
      philhealthNo,
      pagibigNo,
      hiredOn,
      fixedDeductions,
    } = req.body;

    // Get branch settings for rate calculation (only used for Resident Vet)
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(branchId) },
    });

    const workingDaysPerMonth = branch?.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH;
    const workingHoursPerDay = branch?.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY;

    // Calculate rates based on position (or use custom values if provided)
    let ratePerDay: number;
    let ratePerHour: number;

    if (customRatePerDay !== undefined && customRatePerHour !== undefined) {
      // Use custom rates provided by CEO
      ratePerDay = parseFloat(customRatePerDay);
      ratePerHour = parseFloat(customRatePerHour);
    } else {
      // Calculate using position-based formula
      const rates = calculateEmployeeRates(
        parseFloat(salary),
        position as PositionType,
        workingDaysPerMonth,
        workingHoursPerDay
      );
      ratePerDay = rates.ratePerDay;
      ratePerHour = rates.ratePerHour;
    }

    const employee = await prisma.employee.create({
      data: {
        branchId: parseInt(branchId),
        name,
        position,
        salary: parseFloat(salary),
        ratePerDay,
        ratePerHour,
        address,
        sssNo,
        tinNo,
        philhealthNo,
        pagibigNo,
        hiredOn: hiredOn ? new Date(hiredOn) : null,
        fixedDeductions: fixedDeductions
          ? {
              create: fixedDeductions.map((fd: { type: string; amount: number }) => ({
                type: fd.type,
                amount: fd.amount,
              })),
            }
          : undefined,
      },
      include: {
        branch: true,
        fixedDeductions: true,
      },
    });

    return res.status(201).json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update employee
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const {
      branchId,
      name,
      position,
      salary,
      ratePerDay: customRatePerDay,
      ratePerHour: customRatePerHour,
      recalculateRates, // Boolean: if true, recalculate rates from salary
      address,
      sssNo,
      tinNo,
      philhealthNo,
      pagibigNo,
      hiredOn,
      isActive,
    } = req.body;

    // Get existing employee
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { branch: true },
    });

    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Determine which branch to use for rate calculation
    const targetBranchId = branchId ? parseInt(branchId) : existingEmployee.branchId;
    
    // Get branch settings
    const branch = await prisma.branch.findUnique({
      where: { id: targetBranchId },
    });

    const workingDaysPerMonth = branch?.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH;
    const workingHoursPerDay = branch?.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY;

    const updateData: any = {
      branchId: branchId ? parseInt(branchId) : undefined,
      name,
      position,
      address,
      sssNo,
      tinNo,
      philhealthNo,
      pagibigNo,
      hiredOn: hiredOn ? new Date(hiredOn) : undefined,
      isActive,
    };

    // Handle salary and rate updates
    if (salary !== undefined) {
      updateData.salary = parseFloat(salary);
    }

    // Determine the position to use for calculation
    const effectivePosition = (position || existingEmployee.position) as PositionType;

    // Handle rate updates
    if (customRatePerDay !== undefined && customRatePerHour !== undefined) {
      // CEO provided custom rates - use them
      updateData.ratePerDay = parseFloat(customRatePerDay);
      updateData.ratePerHour = parseFloat(customRatePerHour);
    } else if (recalculateRates && salary !== undefined) {
      // Salary changed and user wants to recalculate
      const rates = calculateEmployeeRates(
        parseFloat(salary),
        effectivePosition,
        workingDaysPerMonth,
        workingHoursPerDay
      );
      updateData.ratePerDay = rates.ratePerDay;
      updateData.ratePerHour = rates.ratePerHour;
    }
    // If neither custom rates nor recalculate flag, keep existing rates

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        branch: true,
        fixedDeductions: true,
      },
    });

    return res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recalculate rates for an employee (useful endpoint)
router.post('/:id/recalculate-rates', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { branch: true },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const workingDaysPerMonth = employee.branch?.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH;
    const workingHoursPerDay = employee.branch?.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY;

    const rates = calculateEmployeeRates(
      Number(employee.salary),
      employee.position,
      workingDaysPerMonth,
      workingHoursPerDay
    );

    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        ratePerDay: rates.ratePerDay,
        ratePerHour: rates.ratePerHour,
      },
      include: {
        branch: true,
        fixedDeductions: true,
      },
    });

    return res.json(updatedEmployee);
  } catch (error) {
    console.error('Recalculate rates error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee (soft delete)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fixed deductions
router.put('/:id/fixed-deductions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { deductions } = req.body;

    // Delete existing and create new
    await prisma.fixedDeduction.deleteMany({
      where: { employeeId: parseInt(id) },
    });

    if (deductions && deductions.length > 0) {
      await prisma.fixedDeduction.createMany({
        data: deductions.map((d: { type: string; amount: number }) => ({
          employeeId: parseInt(id),
          type: d.type,
          amount: d.amount,
        })),
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { fixedDeductions: true },
    });

    return res.json(employee);
  } catch (error) {
    console.error('Update fixed deductions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
