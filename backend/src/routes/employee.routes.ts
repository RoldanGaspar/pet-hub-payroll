import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { calculateEmployeeRates, DEFAULT_WORKING_DAYS_PER_MONTH, DEFAULT_WORKING_HOURS_PER_DAY, usesAnnualFormula, getRateFormulaDescription, getRateFormulaDescriptionByMethod, getDefaultCalculationMethod } from '../utils/payrollCalculations';
import { PositionType, RateCalculationMethod } from '@prisma/client';

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
    const method = req.query.method as string | undefined;
    const usesAnnual = method ? method === 'ANNUAL' : usesAnnualFormula(position);
    const description = method 
      ? getRateFormulaDescriptionByMethod(method as 'MONTHLY' | 'ANNUAL')
      : getRateFormulaDescription(position);
    
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
      calculationMethod: rawCalcMethod,
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

    // Determine calculation method: use provided value, or fall back to default for position
    const calculationMethod: RateCalculationMethod = rawCalcMethod || getDefaultCalculationMethod(position as PositionType);

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
      // Calculate using the selected calculation method
      const rates = calculateEmployeeRates(
        parseFloat(salary),
        calculationMethod,
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
        calculationMethod,
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
              create: fixedDeductions.map((fd: { type: string; amount: number; category?: string }) => ({
                type: fd.type,
                amount: fd.amount,
                category: fd.category || 'OTHERS',
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
      calculationMethod: rawCalcMethod,
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

    // Handle calculationMethod update
    const effectiveCalcMethod: RateCalculationMethod = rawCalcMethod || existingEmployee.calculationMethod;
    updateData.calculationMethod = effectiveCalcMethod;

    // Handle salary and rate updates
    if (salary !== undefined) {
      updateData.salary = parseFloat(salary);
    }

    // Determine the position to use for calculation
    const effectivePosition = (position || existingEmployee.position) as PositionType;

    // Check if calculation method changed — auto-recalculate if so
    const calcMethodChanged = rawCalcMethod && rawCalcMethod !== existingEmployee.calculationMethod;

    // Handle rate updates
    if (customRatePerDay !== undefined && customRatePerHour !== undefined) {
      // CEO provided custom rates - use them
      updateData.ratePerDay = parseFloat(customRatePerDay);
      updateData.ratePerHour = parseFloat(customRatePerHour);
    } else if ((recalculateRates && salary !== undefined) || calcMethodChanged) {
      // Salary changed and user wants to recalculate, or calculation method changed
      const salaryToUse = salary !== undefined ? parseFloat(salary) : Number(existingEmployee.salary);
      const rates = calculateEmployeeRates(
        salaryToUse,
        effectiveCalcMethod,
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
      employee.calculationMethod as 'MONTHLY' | 'ANNUAL',
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

    // Get existing fixed deductions before deleting
    const existingFixedDeductions = await prisma.fixedDeduction.findMany({
      where: { employeeId: parseInt(id) },
    });

    const existingTypes = new Set(existingFixedDeductions.map((fd) => fd.type));
    const newTypes = new Set(
      deductions && deductions.length > 0
        ? deductions.map((d: { type: string }) => d.type)
        : []
    );

    // Find deduction types that were removed
    const removedTypes = Array.from(existingTypes).filter((type) => !newTypes.has(type));

    // Delete existing and create new
    await prisma.fixedDeduction.deleteMany({
      where: { employeeId: parseInt(id) },
    });

    if (deductions && deductions.length > 0) {
      await prisma.fixedDeduction.createMany({
        data: deductions.map((d: { type: string; amount: number; category?: string }) => ({
          employeeId: parseInt(id),
          type: d.type,
          amount: d.amount,
          category: d.category || 'OTHERS',
          isActive: true, // All new deductions are active by default
        })),
      });
    }

    // Automatically sync fixed deductions to all payroll periods for this employee
    // This keeps the employee's fixed deductions and payroll deductions in sync
    // When fixed deductions are updated, automatically apply them to all payrolls (divided by each payroll's divisor)
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: { employeeId: parseInt(id) },
      select: { id: true, deductionDivisor: true },
    });

    // Get the updated fixed deductions (only active ones)
    const updatedFixedDeductions = deductions && deductions.length > 0 
      ? deductions.filter((d: { type: string; amount: number }) => d.amount > 0)
      : [];

    // Sync to all payroll periods
    for (const payroll of payrollPeriods) {
      const divisor = payroll.deductionDivisor || 2;

      // First, delete deductions for removed types (types that were deleted from fixed deductions)
      if (removedTypes.length > 0) {
        await prisma.deduction.deleteMany({
          where: {
            payrollId: payroll.id,
            type: { in: removedTypes },
          },
        });
      }

      // Delete existing deductions that match fixed deduction types (will be replaced with updated amounts)
      // (Keep any manually added deductions that aren't in fixed deductions)
      if (updatedFixedDeductions.length > 0) {
        const fixedDeductionTypes = updatedFixedDeductions.map((d: { type: string }) => d.type);
        
        // Delete deductions that are in fixed deductions (will be replaced)
        await prisma.deduction.deleteMany({
          where: {
            payrollId: payroll.id,
            type: { in: fixedDeductionTypes },
          },
        });

        // Create/update deductions from fixed deductions, divided by divisor
        for (const fd of updatedFixedDeductions) {
          const dividedAmount = Number(fd.amount) / divisor;
          // Round to 2 decimal places
          const roundedAmount = Math.round(dividedAmount * 100) / 100;
          
          await prisma.deduction.create({
            data: {
              payrollId: payroll.id,
              type: fd.type,
              amount: roundedAmount,
            },
          });
        }
      } else {
        // If all fixed deductions are removed, delete all deductions that match fixed deduction types
        // Get all possible fixed deduction types to know what to delete
        const allFixedTypes = ['WTAX', 'SSS', 'PAGIBIG', 'PHILHEALTH', 'SUNLIFE', 'BPI_AIA', 
                               'SSS_LOAN', 'PAGIBIG_LOAN', 'COMPANY_LOAN', 'UNIFORM', 
                               'CASH_ADVANCE', 'LATE', 'OTHERS'];
        
        await prisma.deduction.deleteMany({
          where: {
            payrollId: payroll.id,
            type: { in: allFixedTypes },
          },
        });
      }

      // Recalculate totals using centralized service
      const recalcService = new (await import('../modules/payroll/calculators/recalculation.service')).RecalculationService();
      await recalcService.recalculate(payroll.id);
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

// Get employee fixed deductions with available deduction types
router.get('/:id/fixed-deductions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { fixedDeductions: { orderBy: { type: 'asc' } } },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json({
      fixedDeductions: employee.fixedDeductions,
    });
  } catch (error) {
    console.error('Get fixed deductions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get incentive exclusions for an employee
router.get('/:id/incentive-exclusions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const exclusions = await prisma.incentiveExclusion.findMany({
      where: { employeeId: id },
      orderBy: { incentiveType: 'asc' },
    });

    return res.json(exclusions);
  } catch (error) {
    console.error('Get incentive exclusions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle incentive exclusion (add or remove)
router.post('/:id/incentive-exclusions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { incentiveType } = req.body;

    if (!incentiveType) {
      return res.status(400).json({ error: 'incentiveType is required' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if exclusion already exists
    const existing = await prisma.incentiveExclusion.findUnique({
      where: {
        employeeId_incentiveType: {
          employeeId: id,
          incentiveType: incentiveType as string,
        },
      },
    });

    if (existing) {
      // Remove exclusion
      await prisma.incentiveExclusion.delete({
        where: { id: existing.id },
      });
      return res.json({ excluded: false, message: 'Incentive exclusion removed' });
    } else {
      // Add exclusion
      const exclusion = await prisma.incentiveExclusion.create({
        data: {
          employeeId: id,
          incentiveType: incentiveType as string,
        },
      });
      return res.json({ excluded: true, exclusion, message: 'Incentive exclusion added' });
    }
  } catch (error) {
    console.error('Toggle incentive exclusion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
