import { Router } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { branchId } = req.query;

    const branchFilter = branchId ? { branchId: parseInt(branchId as string) } : {};

    // Get counts
    const [
      totalBranches,
      totalEmployees,
      activeEmployees,
      pendingPayrolls,
      recentPayrolls,
      branchStats,
    ] = await Promise.all([
      prisma.branch.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { isActive: true, ...branchFilter } }),
      prisma.employee.count({ where: { isActive: true, ...branchFilter } }),
      prisma.payrollPeriod.count({
        where: {
          status: { in: ['DRAFT', 'PENDING'] },
          employee: branchFilter,
        },
      }),
      prisma.payrollPeriod.findMany({
        where: { employee: branchFilter },
        include: {
          employee: {
            include: { branch: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.branch.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { employees: { where: { isActive: true } } },
          },
          employees: {
            where: { isActive: true },
            include: {
              payrollPeriods: {
                orderBy: { startDate: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    // Calculate total disbursement from recent payrolls
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyPayrolls = await prisma.payrollPeriod.findMany({
      where: {
        startDate: { gte: startOfMonth },
        endDate: { lte: endOfMonth },
        status: { in: ['APPROVED', 'PAID'] },
        employee: branchFilter,
      },
    });

    const totalDisbursement = monthlyPayrolls.reduce((sum, p) => sum + Number(p.netPay), 0);

    // Calculate branch summaries
    const branchSummaries = branchStats.map((branch) => {
      const latestPayrolls = branch.employees.flatMap((e) => e.payrollPeriods);
      const branchDisbursement = latestPayrolls.reduce((sum, p) => sum + Number(p.netPay), 0);

      return {
        id: branch.id,
        name: branch.name,
        type: branch.type,
        employeeCount: branch._count.employees,
        latestDisbursement: branchDisbursement,
      };
    });

    return res.json({
      totalBranches,
      totalEmployees,
      activeEmployees,
      pendingPayrolls,
      totalDisbursement,
      recentPayrolls: recentPayrolls.map((p) => ({
        id: p.id,
        employeeName: p.employee.name,
        branchName: p.employee.branch.name,
        startDate: p.startDate,
        endDate: p.endDate,
        netPay: p.netPay,
        status: p.status,
      })),
      branchSummaries,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payroll summary for a period
router.get('/payroll-summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const branchFilter = branchId ? { branchId: parseInt(branchId as string) } : {};

    const payrolls = await prisma.payrollPeriod.findMany({
      where: {
        startDate: { gte: new Date(startDate as string) },
        endDate: { lte: new Date(endDate as string) },
        employee: { ...branchFilter, isActive: true },
      },
      include: {
        employee: {
          include: { branch: true },
        },
        incentives: true,
        deductions: true,
      },
    });

    const summary = {
      totalEmployees: payrolls.length,
      totalBasicPay: payrolls.reduce((sum, p) => sum + Number(p.basicPay), 0),
      totalHolidayPay: payrolls.reduce((sum, p) => sum + Number(p.holidayPay), 0),
      totalOvertimePay: payrolls.reduce((sum, p) => sum + Number(p.overtimePay), 0),
      totalIncentives: payrolls.reduce((sum, p) => sum + Number(p.totalIncentives), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + Number(p.totalDeductions), 0),
      totalGrossPay: payrolls.reduce((sum, p) => sum + Number(p.grossPay), 0),
      totalNetPay: payrolls.reduce((sum, p) => sum + Number(p.netPay), 0),
      byStatus: {
        draft: payrolls.filter((p) => p.status === 'DRAFT').length,
        pending: payrolls.filter((p) => p.status === 'PENDING').length,
        approved: payrolls.filter((p) => p.status === 'APPROVED').length,
        paid: payrolls.filter((p) => p.status === 'PAID').length,
      },
      payrolls,
    };

    return res.json(summary);
  } catch (error) {
    console.error('Get payroll summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
