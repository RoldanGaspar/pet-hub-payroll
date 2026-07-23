import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { calculatePayroll } from '../utils/payrollCalculations';

const router = Router();

// Get all payroll periods
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { branchId, startDate, endDate, status } = req.query;

    const where: any = {};

    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate as string) };
      where.endDate = { lte: new Date(endDate as string) };
    }

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.employee = { branchId: parseInt(branchId as string) };
    }


    const payrolls = await prisma.payrollPeriod.findMany({
      where,
      include: {
        employee: {
          include: { 
            branch: true,
            fixedDeductions: { where: { isActive: true } },
          },
        },
        incentives: true,
        deductions: true,
      },
      orderBy: [{ startDate: 'desc' }, { employee: { name: 'asc' } }],
    });

    return res.json(payrolls);
  } catch (error: any) {
    console.error('Get payrolls error:', error);
    console.error('Error details:', error?.message, error?.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// Get payroll by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const payroll = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: {
          include: {
            branch: true,
            fixedDeductions: { where: { isActive: true } },
          },
        },
        incentives: true,
        deductions: true,
      },
    });

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    return res.json(payroll);
  } catch (error) {
    console.error('Get payroll error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payroll period for a branch
router.post('/create-period', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { branchId, startDate, endDate, workingDays } = req.body;

    // Get all active employees in the branch
    const employees = await prisma.employee.findMany({
      where: {
        branchId: parseInt(branchId),
        isActive: true,
      },
      include: { fixedDeductions: true },
    });

    // Create payroll periods for each employee
    const payrolls = await Promise.all(
      employees.map(async (employee) => {
        // Check if payroll already exists
        const existing = await prisma.payrollPeriod.findFirst({
          where: {
            employeeId: employee.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
        });

        if (existing) {
          return existing;
        }

        const divisor = 2; // Default divisor (semi-monthly)
        const newPayroll = await prisma.payrollPeriod.create({
          data: {
            employeeId: employee.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            workingDays: workingDays || 15,
            totalDaysPresent: workingDays || 15,
            deductionDivisor: divisor,
            status: 'DRAFT',
          },
          include: {
            employee: { include: { branch: true } },
            incentives: true,
            deductions: true,
          },
        });

        // Automatically apply fixed deductions to the new payroll (divided by divisor)
        if (employee.fixedDeductions && employee.fixedDeductions.length > 0) {
          const activeFixedDeductions = employee.fixedDeductions.filter((fd) => fd.isActive);
          
          for (const fd of activeFixedDeductions) {
            const dividedAmount = Number(fd.amount) / divisor;
            // Round to 2 decimal places
            const roundedAmount = Math.round(dividedAmount * 100) / 100;
            
            await prisma.deduction.create({
              data: {
                payrollId: newPayroll.id,
                type: fd.type,
                amount: roundedAmount,
              },
            });
          }

          // Recalculate totals
          const allDeductions = await prisma.deduction.findMany({
            where: { payrollId: newPayroll.id },
          });
          const totalDeductions = allDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

          await prisma.payrollPeriod.update({
            where: { id: newPayroll.id },
            data: { totalDeductions },
          });
        }

        // Return the updated payroll with deductions
        return prisma.payrollPeriod.findUnique({
          where: { id: newPayroll.id },
          include: {
            employee: { include: { branch: true } },
            incentives: true,
            deductions: true,
          },
        });
      })
    );

    return res.status(201).json(payrolls);
  } catch (error) {
    console.error('Create payroll period error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payroll
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const {
      workingDays,
      dayOff,
      absences,
      totalDaysPresent,
      holidays,
      overtimeHours,
      lateMinutes,
      mealAllowance,
      silPay,
      birthdayLeave,
      status,
    } = req.body;

    // Get existing payroll with employee data
    const existing = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: true,
        incentives: true,
        deductions: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Calculate totals
    const totalIncentives = existing.incentives.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalDeductions = existing.deductions.reduce((sum, d) => sum + Number(d.amount), 0);

    // Calculate payroll
    // Total Days Paid = Working Days - Rest Days (dayOff) - Absences
    const calculatedDaysPresent =
      totalDaysPresent ?? (workingDays || existing.workingDays) - (dayOff ?? existing.dayOff) - (absences ?? existing.absences);

    const calculation = calculatePayroll({
      salary: Number(existing.employee.salary),
      ratePerDay: Number(existing.employee.ratePerDay),
      ratePerHour: Number(existing.employee.ratePerHour),
      workingDays: workingDays ?? existing.workingDays,
      totalDaysPresent: calculatedDaysPresent,
      holidays: holidays !== undefined ? parseFloat(holidays) : Number(existing.holidays),
      overtimeHours: overtimeHours ?? Number(existing.overtimeHours),
      lateMinutes: lateMinutes ?? Number(existing.lateMinutes),
      mealAllowance: mealAllowance ?? Number(existing.mealAllowance),
      silPay: silPay ?? Number(existing.silPay),
      birthdayLeave: birthdayLeave ?? Number(existing.birthdayLeave),
      totalIncentives,
      totalDeductions,
    });

    const payroll = await prisma.payrollPeriod.update({
      where: { id: parseInt(id) },
      data: {
        workingDays: workingDays ?? existing.workingDays,
        dayOff: dayOff ?? existing.dayOff,
        absences: absences ?? existing.absences,
        totalDaysPresent: calculatedDaysPresent,
        holidays: holidays !== undefined ? parseFloat(holidays) : Number(existing.holidays),
        overtimeHours: overtimeHours ?? existing.overtimeHours,
        lateMinutes: lateMinutes ?? existing.lateMinutes,
        mealAllowance: mealAllowance ?? existing.mealAllowance,
        silPay: silPay ?? existing.silPay,
        birthdayLeave: birthdayLeave ?? existing.birthdayLeave,
        basicPay: calculation.basicPay,
        holidayPay: calculation.holidayPay,
        overtimePay: calculation.overtimePay,
        totalIncentives,
        grossPay: calculation.grossPay,
            totalDeductions, // Store only sum of deduction line items (late deduction handled by formula)
        netPay: calculation.netPay,
        status: status ?? existing.status,
      },
      include: {
        employee: { include: { branch: true } },
        incentives: true,
        deductions: true,
      },
    });

    return res.json(payroll);
  } catch (error) {
    console.error('Update payroll error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate/recalculate payroll
router.post('/:id/calculate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const payroll = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: { 
          include: { 
            fixedDeductions: { where: { isActive: true } },
          },
        },
        incentives: true,
        deductions: true,
      },
    });

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Calculate totals
    const totalIncentives = payroll.incentives.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalDeductions = payroll.deductions.reduce((sum, d) => sum + Number(d.amount), 0);

    // Recalculate totalDaysPresent: Working Days - Rest Days (dayOff) - Absences
    const calculatedDaysPresent = payroll.workingDays - payroll.dayOff - payroll.absences;

    const calculation = calculatePayroll({
      salary: Number(payroll.employee.salary),
      ratePerDay: Number(payroll.employee.ratePerDay),
      ratePerHour: Number(payroll.employee.ratePerHour),
      workingDays: payroll.workingDays,
      totalDaysPresent: calculatedDaysPresent,
      holidays: Number(payroll.holidays),
      overtimeHours: Number(payroll.overtimeHours),
      lateMinutes: Number(payroll.lateMinutes),
      mealAllowance: Number(payroll.mealAllowance),
      silPay: Number(payroll.silPay),
      birthdayLeave: Number(payroll.birthdayLeave),
      totalIncentives,
      totalDeductions,
    });

    const updated = await prisma.payrollPeriod.update({
      where: { id: parseInt(id) },
      data: {
        totalDaysPresent: calculatedDaysPresent, // Update with recalculated value
        basicPay: calculation.basicPay,
        holidayPay: calculation.holidayPay,
        overtimePay: calculation.overtimePay,
        totalIncentives,
        grossPay: calculation.grossPay,
            totalDeductions, // Store only sum of deduction line items (late deduction handled by formula)
        netPay: calculation.netPay,
      },
      include: {
        employee: { include: { branch: true } },
        incentives: true,
        deductions: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Calculate payroll error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payroll
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.payrollPeriod.delete({
      where: { id: parseInt(id) },
    });

    return res.json({ message: 'Payroll deleted successfully' });
  } catch (error) {
    console.error('Delete payroll error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
