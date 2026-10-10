import prisma from '../../shared/database/prisma';

export class DashboardService {
  async getStats(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const [
      totalBranches, totalEmployees, activeEmployees, pendingPayrolls,
      recentPayrolls, branchStats, todayAttendance, payrollStatusBreakdown,
    ] = await Promise.all([
      prisma.branch.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { ...(branchId ? { branchId } : {}) } }),
      prisma.employee.count({ where: { isActive: true, ...(branchId ? { branchId } : {}) } }),
      prisma.payrollPeriod.count({ where: { status: { in: ['DRAFT', 'PENDING'] }, employee: branchFilter } }),
      prisma.payrollPeriod.findMany({ where: { employee: branchFilter }, include: { employee: { include: { branch: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.branch.findMany({ where: { isActive: true }, include: { _count: { select: { employees: { where: { isActive: true } } } }, employees: { where: { isActive: true }, include: { payrollPeriods: { orderBy: { startDate: 'desc' }, take: 1 } } } } }),
      this.getTodayAttendance(branchId),
      this.getPayrollStatusBreakdown(branchId),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthlyPayrolls = await prisma.payrollPeriod.findMany({
      where: { startDate: { gte: startOfMonth }, endDate: { lte: endOfMonth }, status: { in: ['APPROVED', 'PAID'] }, employee: branchFilter },
    });
    const totalDisbursement = monthlyPayrolls.reduce((sum, p) => sum + Number(p.netPay), 0);

    // Gross/Net for current month
    const grossPay = monthlyPayrolls.reduce((s, p) => s + Number(p.grossPay), 0);
    const netPay = monthlyPayrolls.reduce((s, p) => s + Number(p.netPay), 0);

    // Previous month comparison
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevMonthPayrolls = await prisma.payrollPeriod.findMany({
      where: { startDate: { gte: prevStart }, endDate: { lte: prevEnd }, status: { in: ['APPROVED', 'PAID'] }, employee: branchFilter },
    });
    const prevDisbursement = prevMonthPayrolls.reduce((sum, p) => sum + Number(p.netPay), 0);
    const prevEmployeeCount = await prisma.employee.count({ where: { isActive: true, ...(branchId ? { branchId } : {}), hiredOn: { lte: prevEnd } } });

    const disbursementChange = prevDisbursement > 0
      ? Math.round(((totalDisbursement - prevDisbursement) / prevDisbursement) * 100)
      : 0;
    const employeeChange = activeEmployees - prevEmployeeCount;

    return {
      totalBranches, totalEmployees, activeEmployees, pendingPayrolls,
      totalDisbursement, grossPay, netPay,
      disbursementChange, employeeChange,
      todayAttendance,
      payrollStatusBreakdown,
      recentPayrolls: recentPayrolls.map((p) => ({
        id: p.id, employeeName: p.employee.name, branchName: p.employee.branch.name,
        startDate: p.startDate, endDate: p.endDate, netPay: p.netPay, status: p.status,
      })),
      branchSummaries: branchStats.map((b) => ({
        id: b.id, name: b.name, type: b.type,
        employeeCount: b._count.employees,
        latestDisbursement: b.employees.flatMap((e) => e.payrollPeriods).reduce((sum, p) => sum + Number(p.netPay), 0),
      })),
    };
  }

  async getPayrollSummary(startDate: string, endDate: string, branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const payrolls = await prisma.payrollPeriod.findMany({
      where: {
        startDate: { gte: new Date(startDate) },
        endDate: { lte: new Date(endDate) },
        employee: { ...branchFilter, isActive: true },
      },
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
      byStatus: {
        draft: payrolls.filter((p) => p.status === 'DRAFT').length,
        pending: payrolls.filter((p) => p.status === 'PENDING').length,
        approved: payrolls.filter((p) => p.status === 'APPROVED').length,
        paid: payrolls.filter((p) => p.status === 'PAID').length,
      },
      payrolls,
    };
  }

  async getMonthlyTrend(months: number = 6, branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const result = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const date = new Date(year, month, 1);
      const actualYear = date.getFullYear();
      const actualMonth = date.getMonth();
      const startOfMonth = new Date(actualYear, actualMonth, 1);
      const endOfMonth = new Date(actualYear, actualMonth + 1, 0);

      const payrolls = await prisma.payrollPeriod.findMany({
        where: {
          startDate: { gte: startOfMonth },
          endDate: { lte: endOfMonth },
          status: { in: ['APPROVED', 'PAID'] },
          employee: branchFilter,
        },
      });

      const employeeIds = new Set(payrolls.map((p) => p.employeeId));

      result.push({
        month: `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}`,
        label: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        totalNetPay: Math.round(payrolls.reduce((s, p) => s + Number(p.netPay), 0)),
        totalGrossPay: Math.round(payrolls.reduce((s, p) => s + Number(p.grossPay), 0)),
        employeeCount: employeeIds.size,
        payrollCount: payrolls.length,
      });
    }

    return { months: result };
  }

  async getBranchComparison(month?: string, branchId?: number) {
    const now = new Date();
    const [yearStr, monthStr] = month ? month.split('-') : [String(now.getFullYear()), String(now.getMonth() + 1)];
    const y = parseInt(yearStr);
    const m = parseInt(monthStr);
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0);

    const branches = await prisma.branch.findMany({
      where: { isActive: true, ...(branchId ? { id: branchId } : {}) },
      include: {
        employees: {
          where: { isActive: true },
          select: {
            id: true,
            payrollPeriods: {
              where: { startDate: { gte: startOfMonth }, endDate: { lte: endOfMonth } },
              select: { netPay: true },
            },
          },
        },
      },
    });

    const data = branches.map((b) => {
      const totalNetPay = b.employees.reduce(
        (sum, e) => sum + e.payrollPeriods.reduce((s, p) => s + Number(p.netPay), 0),
        0
      );
      return {
        id: b.id,
        name: b.name,
        type: b.type,
        employeeCount: b.employees.length,
        totalNetPay: Math.round(totalNetPay),
        avgPerEmployee: b.employees.length > 0 ? Math.round(totalNetPay / b.employees.length) : 0,
      };
    });

    const grandTotal = data.reduce((s, b) => s + b.totalNetPay, 0);

    return {
      month: `${y}-${String(m).padStart(2, '0')}`,
      branches: data.sort((a, b) => b.totalNetPay - a.totalNetPay),
      totalNetPay: grandTotal,
    };
  }

  async getFinancialBreakdown(month?: string, branchId?: number) {
    const now = new Date();
    const [yearStr, monthStr] = month ? month.split('-') : [String(now.getFullYear()), String(now.getMonth() + 1)];
    const y = parseInt(yearStr);
    const m = parseInt(monthStr);
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0);

    const branchFilter = branchId ? { branchId } : {};
    const payrolls = await prisma.payrollPeriod.findMany({
      where: {
        startDate: { gte: startOfMonth },
        endDate: { lte: endOfMonth },
        status: { in: ['APPROVED', 'PAID'] },
        employee: branchFilter,
      },
      include: { deductions: true },
    });

    const grossPay = payrolls.reduce((s, p) => s + Number(p.grossPay), 0);
    const netPay = payrolls.reduce((s, p) => s + Number(p.netPay), 0);
    const totalDeductions = grossPay - netPay;

    const deductionCategories: Record<string, number> = {};
    payrolls.forEach((p) => {
      p.deductions.forEach((d) => {
        const cat = d.type.includes('SSS') ? 'SSS'
          : d.type.includes('PHILHEALTH') ? 'PhilHealth'
          : d.type.includes('PAGIBIG') ? 'PagIBIG'
          : d.type === 'WTAX' ? 'WTax'
          : d.type.includes('INSURANCE') || d.type === 'SUNLIFE' || d.type === 'BPI_AIA' ? 'Insurance'
          : d.type.includes('LOAN') || d.type === 'COMPANY_LOAN' ? 'Loans'
          : 'Others';
        deductionCategories[cat] = (deductionCategories[cat] || 0) + Number(d.amount);
      });
    });

    return {
      month: `${y}-${String(m).padStart(2, '0')}`,
      grossPay: Math.round(grossPay),
      netPay: Math.round(netPay),
      totalDeductions: Math.round(totalDeductions),
      employeeCount: payrolls.length,
      deductions: Object.entries(deductionCategories)
        .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  async getEmployeeDistribution(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const employees = await prisma.employee.findMany({
      where: { isActive: true, ...(branchId ? { branchId } : {}) },
      select: { position: true },
    });

    const distribution: Record<string, number> = {};
    employees.forEach((e) => {
      distribution[e.position] = (distribution[e.position] || 0) + 1;
    });

    const total = employees.length;

    return {
      total,
      distribution: Object.entries(distribution)
        .map(([position, count]) => ({
          position,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getAlerts(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const now = new Date();
    const alerts: { type: string; message: string; severity: string; link?: string }[] = [];

    // Pending payrolls needing approval
    const pendingCount = await prisma.payrollPeriod.count({
      where: { status: { in: ['DRAFT', 'PENDING'] }, employee: branchFilter },
    });
    if (pendingCount > 0) {
      alerts.push({
        type: 'pending_approval',
        message: `${pendingCount} payroll${pendingCount > 1 ? 's' : ''} awaiting approval`,
        severity: 'danger',
        link: '/payroll',
      });
    }

    // Employees missing government IDs
    const missingSSS = await prisma.employee.count({
      where: { isActive: true, ...branchFilter, OR: [{ sssNo: null }, { sssNo: '' }] },
    });
    if (missingSSS > 0) {
      alerts.push({
        type: 'missing_data',
        message: `${missingSSS} employee${missingSSS > 1 ? 's' : ''} missing SSS number`,
        severity: 'warning',
        link: '/employees',
      });
    }

    // Employees without fixed deductions
    const empWithoutDeductions = await prisma.employee.count({
      where: { isActive: true, ...branchFilter, fixedDeductions: { none: {} } },
    });
    if (empWithoutDeductions > 0) {
      alerts.push({
        type: 'missing_deductions',
        message: `${empWithoutDeductions} employee${empWithoutDeductions > 1 ? 's' : ''} without fixed deductions`,
        severity: 'warning',
        link: '/employees',
      });
    }

    // Upcoming payroll period (semi-monthly: 1-15 and 16-end)
    const day = now.getDate();
    const nextRunDate = day < 15 ? new Date(now.getFullYear(), now.getMonth(), 15) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntil = Math.ceil((nextRunDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 5) {
      alerts.push({
        type: 'upcoming_payroll',
        message: `Next payroll run in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${nextRunDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
        severity: 'info',
        link: '/payroll',
      });
    }

    return { alerts, count: alerts.length };
  }

  async getPayrollCalendar(month?: string, year?: string) {
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);

    // Get the day of week the month starts (0=Sun)
    const startDay = firstDay.getDay();

    // Payroll run dates for semi-monthly
    const midDate = new Date(y, m - 1, 15);
    const endDate = new Date(y, m - 1, lastDay.getDate());

    // Get existing payroll periods to mark
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: {
        startDate: { gte: firstDay },
        endDate: { lte: lastDay },
      },
      select: { startDate: true, endDate: true, status: true },
      distinct: ['startDate', 'endDate'],
    });

    const runDates = payrollPeriods.map((p) => ({
      start: p.startDate.toISOString().split('T')[0],
      end: p.endDate.toISOString().split('T')[0],
      status: p.status,
    }));

    return {
      year: y,
      month: m,
      monthLabel: firstDay.toLocaleString('en-US', { month: 'long' }),
      daysInMonth: lastDay.getDate(),
      startDay,
      runDates,
      payrollRuns: [
        { label: 'Mid-Month', date: midDate.toISOString().split('T')[0], isPast: midDate < now },
        { label: 'End-Month', date: endDate.toISOString().split('T')[0], isPast: endDate < now },
      ],
    };
  }

  async getPayrollForecast(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const employees = await prisma.employee.findMany({
      where: { isActive: true, ...(branchId ? { branchId } : {}) },
      select: { salary: true },
    });

    const totalSalary = employees.reduce((s, e) => s + Number(e.salary), 0);
    // Estimate: semi-monthly = half of monthly salary pool
    const estimatedSemiMonthly = Math.round(totalSalary / 2);

    return {
      activeEmployees: employees.length,
      totalMonthlySalary: totalSalary,
      estimatedNextRun: estimatedSemiMonthly,
    };
  }

  // -- Private helpers --

  private async getTodayAttendance(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Count active employees
    const totalActive = await prisma.employee.count({ where: { isActive: true, ...(branchId ? { branchId } : {}) } });

    // Attendance is not tracked as a separate model — we use payroll periods as proxy
    // Today's attendance = employees who have a payroll period covering today
    const payrollsToday = await prisma.payrollPeriod.count({
      where: {
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
        employee: { isActive: true, ...branchFilter },
      },
    });

    return {
      total: totalActive,
      inPayroll: payrollsToday,
      notInPayroll: totalActive - payrollsToday,
    };
  }

  private async getPayrollStatusBreakdown(branchId?: number) {
    const branchFilter = branchId ? { branchId } : {};
    const [draft, pending, approved, paid] = await Promise.all([
      prisma.payrollPeriod.count({ where: { status: 'DRAFT', employee: branchFilter } }),
      prisma.payrollPeriod.count({ where: { status: 'PENDING', employee: branchFilter } }),
      prisma.payrollPeriod.count({ where: { status: 'APPROVED', employee: branchFilter } }),
      prisma.payrollPeriod.count({ where: { status: 'PAID', employee: branchFilter } }),
    ]);
    return { draft, pending, approved, paid, total: draft + pending + approved + paid };
  }
}
