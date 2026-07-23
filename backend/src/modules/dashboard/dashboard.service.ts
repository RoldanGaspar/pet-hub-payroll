import prisma from '../../shared/database/prisma';

export class DashboardService {
  async getStats(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const [totalBranches, totalEmployees, pendingPayrolls, recentPayrolls, branchStats] = await Promise.all([
      prisma.branch.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { isActive: true, ...(branchId ? { branchId } : {}) } }),
      prisma.payrollPeriod.count({ where: { status: { in: ['DRAFT', 'PENDING'] }, employee: branchFilter } }),
      prisma.payrollPeriod.findMany({ where: { employee: branchFilter }, include: { employee: { include: { branch: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.branch.findMany({ where: { isActive: true }, include: { _count: { select: { employees: { where: { isActive: true } } } }, employees: { where: { isActive: true }, include: { payrollPeriods: { orderBy: { startDate: 'desc' }, take: 1 } } } } }),
    ]);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthlyPayrolls = await prisma.payrollPeriod.findMany({ where: { startDate: { gte: startOfMonth }, endDate: { lte: endOfMonth }, status: { in: ['APPROVED', 'PAID'] }, employee: branchFilter } });
    const totalDisbursement = monthlyPayrolls.reduce((sum, p) => sum + Number(p.netPay), 0);

    return {
      totalBranches, totalEmployees, activeEmployees: totalEmployees, pendingPayrolls, totalDisbursement,
      recentPayrolls: recentPayrolls.map((p) => ({ id: p.id, employeeName: p.employee.name, branchName: p.employee.branch.name, startDate: p.startDate, endDate: p.endDate, netPay: p.netPay, status: p.status })),
      branchSummaries: branchStats.map((b) => ({ id: b.id, name: b.name, type: b.type, employeeCount: b._count.employees, latestDisbursement: b.employees.flatMap((e) => e.payrollPeriods).reduce((sum, p) => sum + Number(p.netPay), 0) })),
    };
  }

  async getPayrollSummary(startDate: string, endDate: string, branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const payrolls = await prisma.payrollPeriod.findMany({
      where: { startDate: { gte: new Date(startDate) }, endDate: { lte: new Date(endDate) }, employee: { ...branchFilter, isActive: true } },
      include: { employee: { include: { branch: true } }, incentives: true, deductions: true },
    });
    return {
      totalEmployees: payrolls.length,
      totalBasicPay: payrolls.reduce((s, p) => s + Number(p.basicPay), 0),
      totalHolidayPay: payrolls.reduce((s, p) => s + Number(p.holidayPay), 0),
      totalOvertimePay: payrolls.reduce((s, p) => s + Number(p.overtimePay), 0),
      totalIncentives: payrolls.reduce((s, p) => s + Number(p.totalIncentives), 0),
      totalDeductions: payrolls.reduce((s, p) => s + Number(p.totalDeductions), 0),
      totalGrossPay: payrolls.reduce((s, p) => s + Number(p.grossPay), 0),
      totalNetPay: payrolls.reduce((s, p) => s + Number(p.netPay), 0),
      byStatus: { draft: payrolls.filter((p) => p.status === 'DRAFT').length, pending: payrolls.filter((p) => p.status === 'PENDING').length, approved: payrolls.filter((p) => p.status === 'APPROVED').length, paid: payrolls.filter((p) => p.status === 'PAID').length },
      payrolls,
    };
  }
}
