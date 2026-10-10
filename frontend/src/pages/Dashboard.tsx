import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Calculator, Wallet, ArrowRight, ArrowUpRight, ArrowDownRight,
  RefreshCw, AlertTriangle, Clock, TrendingUp,
  Calendar, Bell, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import Header from '../components/layout/Header';
import { dashboardApi, branchApi } from '../utils/api';
import { formatCurrency, formatDate, cn } from '../utils/helpers';
import { STATUS_LABELS, BRANCH_TYPE_LABELS, POSITION_LABELS, type PayrollStatus, type BranchType, type Branch, type PositionType } from '../types';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4f46e5', '#e11d48'];
const SEVERITY_STYLES: Record<string, string> = {
  danger: 'border-red-400 bg-red-50 text-red-700',
  warning: 'border-amber-400 bg-amber-50 text-amber-700',
  info: 'border-blue-400 bg-blue-50 text-blue-700',
};

export default function Dashboard() {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const branchId = selectedBranch !== 'all' ? parseInt(selectedBranch) : undefined;

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll().then(r => r.data),
  });

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats', branchId],
    queryFn: () => dashboardApi.getStats(branchId).then(r => r.data),
    retry: 1,
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard-monthly-trend', branchId],
    queryFn: () => dashboardApi.getMonthlyTrend(6, branchId).then(r => r.data),
  });

  const branchCompQuery = useQuery({
    queryKey: ['dashboard-branch-comparison', branchId],
    queryFn: () => dashboardApi.getBranchComparison(undefined, branchId).then(r => r.data),
  });

  const finBreakdownQuery = useQuery({
    queryKey: ['dashboard-financial-breakdown', branchId],
    queryFn: () => dashboardApi.getFinancialBreakdown(undefined, branchId).then(r => r.data),
  });

  const empDistQuery = useQuery({
    queryKey: ['dashboard-employee-distribution', branchId],
    queryFn: () => dashboardApi.getEmployeeDistribution(branchId).then(r => r.data),
  });

  const alertsQuery = useQuery({
    queryKey: ['dashboard-alerts', branchId],
    queryFn: () => dashboardApi.getAlerts(branchId).then(r => r.data),
  });

  const calendarQuery = useQuery({
    queryKey: ['dashboard-payroll-calendar'],
    queryFn: () => dashboardApi.getPayrollCalendar().then(r => r.data),
  });

  const forecastQuery = useQuery({
    queryKey: ['dashboard-payroll-forecast', branchId],
    queryFn: () => dashboardApi.getPayrollForecast(branchId).then(r => r.data),
  });

  if (isLoading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Welcome back! Here's what's happening." />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="p-5 animate-pulse">
                  <Skeleton className="h-3 w-1/2 mb-3" />
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Dashboard" subtitle="Welcome back! Here's what's happening." />
        <div className="p-6">
          <Card className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Unable to load dashboard</h3>
            <p className="text-sm text-slate-500 mb-4">Something went wrong while fetching data.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </Card>
        </div>
      </>
    );
  }

  const attendance = stats?.todayAttendance;
  const statusBreakdown = stats?.payrollStatusBreakdown;
  const totalStatus = statusBreakdown?.total || 1;

  return (
    <>
      <Header title="Dashboard" subtitle="Welcome back! Here's what's happening." />

      <div className="p-6 space-y-6">
        {/* Period + Branch Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedBranch} onValueChange={(value) => setSelectedBranch(value ?? 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map((b: Branch) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {selectedBranch ? 'Showing data for selected branch' : 'Showing data for all branches'}
          </span>
        </div>

        {/* Row 1 — KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Active Employees"
            value={stats?.activeEmployees || 0}
            change={stats?.employeeChange}
            icon={Users}
            color="bg-emerald-500"
            href="/employees"
          />
          <StatCard
            label="Today's Coverage"
            value={attendance ? `${attendance.inPayroll}/${attendance.total}` : '-/-'}
            subtitle={`${attendance?.notInPayroll || 0} not in active period`}
            icon={Clock}
            color="bg-blue-500"
          />
          <StatCard
            label="Pending Payrolls"
            value={stats?.pendingPayrolls || 0}
            icon={Calculator}
            color="bg-amber-500"
            href="/payroll"
          />
          <StatCard
            label="Monthly Disbursement"
            value={formatCurrency(stats?.totalDisbursement || 0)}
            change={stats?.disbursementChange}
            icon={Wallet}
            color="bg-purple-500"
            href="/payroll"
            changePrefix="vs last month"
          />
          <StatCard
            label="Gross / Net Payroll"
            value={`${formatCurrency(stats?.grossPay || 0)} / ${formatCurrency(stats?.netPay || 0)}`}
            icon={TrendingUp}
            color="bg-primary-500"
          />
        </div>

        {/* Payroll Status Breakdown Bar */}
        {statusBreakdown && (
          <Card className="p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payroll Status</h4>
            <div className="flex h-6 rounded-full overflow-hidden bg-slate-100">
              {statusBreakdown.draft > 0 && (
                <div className="bg-slate-400 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(statusBreakdown.draft / totalStatus) * 100}%` }}>
                  {statusBreakdown.draft} Draft
                </div>
              )}
              {statusBreakdown.pending > 0 && (
                <div className="bg-amber-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(statusBreakdown.pending / totalStatus) * 100}%` }}>
                  {statusBreakdown.pending} Pending
                </div>
              )}
              {statusBreakdown.approved > 0 && (
                <div className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(statusBreakdown.approved / totalStatus) * 100}%` }}>
                  {statusBreakdown.approved} Approved
                </div>
              )}
              {statusBreakdown.paid > 0 && (
                <div className="bg-emerald-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(statusBreakdown.paid / totalStatus) * 100}%` }}>
                  {statusBreakdown.paid} Paid
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-400" /> Draft {statusBreakdown.draft}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Pending {statusBreakdown.pending}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Approved {statusBreakdown.approved}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Paid {statusBreakdown.paid}</span>
            </div>
          </Card>
        )}

        {/* Row 2 — Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card className="p-5">
            <h4 className="font-semibold text-slate-900 mb-1">Monthly Disbursement Trend</h4>
            <p className="text-xs text-slate-500 mb-4">Last {trendQuery.data?.months?.length || 6} months</p>
            {trendQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : trendQuery.data?.months ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendQuery.data.months} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Net Pay']} labelStyle={{ color: '#1e293b' }} />
                  <Bar dataKey="totalNetPay" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Card>

          {/* Branch Comparison */}
          <Card className="p-5">
            <h4 className="font-semibold text-slate-900 mb-1">Branch Payroll Comparison</h4>
            <p className="text-xs text-slate-500 mb-4">This month</p>
            {branchCompQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : branchCompQuery.data?.branches ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={branchCompQuery.data.branches} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Net Pay']} />
                  <Bar dataKey="totalNetPay" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Card>
        </div>

        {/* Row 3 — Employee Distribution + Financial Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Distribution Pie */}
          <Card className="p-5">
            <h4 className="font-semibold text-slate-900 mb-1">Employees by Position</h4>
            <p className="text-xs text-slate-500 mb-4">{empDistQuery.data?.total || 0} total</p>
            {empDistQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : empDistQuery.data?.distribution ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={empDistQuery.data.distribution} dataKey="count" nameKey="position" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${POSITION_LABELS[props.position as PositionType]?.split(' ')[0] || props.position} (${props.count})`}>
                    {empDistQuery.data.distribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, _name: any, props: any) => [value, POSITION_LABELS[props.payload.position as PositionType] || props.payload.position]} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </Card>

          {/* Financial Breakdown */}
          <Card className="p-5">
            <h4 className="font-semibold text-slate-900 mb-1">Financial Breakdown</h4>
            <p className="text-xs text-slate-500 mb-4">This month</p>
            {finBreakdownQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : finBreakdownQuery.data ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-slate-500">Gross Payroll</span>
                  <span className="font-bold text-slate-900">{formatCurrency(finBreakdownQuery.data.grossPay)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-slate-500">Net Payroll</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(finBreakdownQuery.data.netPay)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-slate-500">Total Deductions</span>
                  <span className="font-bold text-red-600">{formatCurrency(finBreakdownQuery.data.totalDeductions)}</span>
                </div>
                <div className="pt-2">
                  <p className="text-xs font-medium text-slate-500 mb-2">Deduction Breakdown</p>
                  {finBreakdownQuery.data.deductions?.map((d: { category: string; amount: number }) => (
                    <div key={d.category} className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-slate-600">{d.category}</span>
                      <span className="text-sm font-medium text-slate-700">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Row 4 — Alerts + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4" /> Alerts
                {alertsQuery.data?.count ? (
                  <Badge variant="destructive" className="text-xs">{alertsQuery.data.count}</Badge>
                ) : null}
              </h4>
            </div>
            {alertsQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : alertsQuery.data?.alerts?.length ? (
              <div className="space-y-2">
                {alertsQuery.data.alerts.map((a: any, i: number) => (
                  a.link ? (
                    <Link key={i} to={a.link} className={cn('flex items-start gap-3 p-3 rounded-lg border-l-4 text-sm transition-colors hover:bg-opacity-80', SEVERITY_STYLES[a.severity] || 'border-slate-400 bg-slate-50 text-slate-700')}>
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{a.message}</span>
                    </Link>
                  ) : (
                    <div key={i} className={cn('flex items-start gap-3 p-3 rounded-lg border-l-4 text-sm', SEVERITY_STYLES[a.severity] || 'border-slate-400 bg-slate-50 text-slate-700')}>
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{a.message}</span>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No alerts — everything looks good!</p>
            )}
          </Card>

          {/* Payroll Calendar + Forecast */}
          <Card className="p-5">
            <h4 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Payroll Calendar
            </h4>
            {calendarQuery.isLoading ? (
              <Skeleton className="h-48 w-full rounded-lg mt-3" />
            ) : calendarQuery.data ? (
              <div className="mt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {calendarQuery.data.monthLabel} {calendarQuery.data.year}
                </p>
                <div className="space-y-2">
                  {calendarQuery.data.payrollRuns?.map((run: any, i: number) => (
                    <div key={i} className={cn('flex justify-between items-center p-3 rounded-lg border', run.isPast ? 'bg-slate-50 border-slate-200' : 'bg-primary-50 border-primary-200')}>
                      <div>
                        <span className="font-medium text-sm text-slate-800">{run.label}</span>
                        <p className="text-xs text-slate-500">{formatDate(run.date, 'MMM dd, yyyy')}</p>
                      </div>
                      <Badge variant={run.isPast ? 'secondary' : 'default'} className={run.isPast ? '' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                        {run.isPast ? 'Past' : 'Upcoming'}
                      </Badge>
                    </div>
                  ))}
                </div>
                {forecastQuery.data && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-800 mb-1">Estimated Next Payroll Run</p>
                    <p className="text-lg font-bold text-amber-900">
                      {formatCurrency(forecastQuery.data.estimatedNextRun)}
                    </p>
                    <p className="text-xs text-amber-600">
                      Based on {forecastQuery.data.activeEmployees} active employees
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        </div>

        {/* Row 5 — Recent Payrolls + Branch Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payrolls */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <CardTitle className="text-lg">Recent Payrolls</CardTitle>
              <Link to="/payroll" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentPayrolls?.slice(0, 5).map((payroll: any) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium text-slate-900">{payroll.employeeName}</TableCell>
                    <TableCell>{payroll.branchName}</TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(payroll.startDate, 'MMM dd')} - {formatDate(payroll.endDate, 'MMM dd')}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(payroll.netPay)}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={cn(
                          payroll.status === 'DRAFT' && 'bg-slate-100 text-slate-700 hover:bg-slate-100',
                          payroll.status === 'PENDING' && 'bg-amber-100 text-amber-700 hover:bg-amber-100',
                          payroll.status === 'APPROVED' && 'bg-blue-100 text-blue-700 hover:bg-blue-100',
                          payroll.status === 'PAID' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        )}>
                          {STATUS_LABELS[payroll.status as PayrollStatus]}
                        </Badge>
                      </TableCell>
                  </TableRow>
                ))}
                {(!stats?.recentPayrolls || stats.recentPayrolls.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">No recent payrolls</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Branch Summary */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white">
              <CardTitle className="text-lg">Branch Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.branchSummaries?.map((branch: any) => (
                <Link
                  key={branch.id}
                  to={`/branches/${branch.id}`}
                  className="block p-4 rounded-lg bg-gradient-to-r from-slate-50 to-white hover:from-primary-50 hover:to-white border border-slate-200 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{branch.name}</h4>
                    <Badge variant="secondary">
                      {BRANCH_TYPE_LABELS[branch.type as BranchType]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="text-slate-500 font-medium">{branch.employeeCount} employees</span>
                    <span className="font-bold text-primary-600 text-base">
                      {formatCurrency(branch.latestDisbursement)}
                    </span>
                  </div>
                </Link>
              ))}
              {(!stats?.branchSummaries || stats.branchSummaries.length === 0) && (
                <p className="text-center text-slate-500 py-8">No branches found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label, value, change, subtitle, icon: Icon, color, href, changePrefix,
}: {
  label: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: any;
  color: string;
  href?: string;
  changePrefix?: string;
}) {
  const content = (
    <Card className="p-5 hover:shadow-lg transition-all duration-200 group border-l-4 border-l-transparent hover:border-l-primary-500 h-full">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn('p-2 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {change !== undefined && change !== 0 ? (
        <p className={cn('text-xs mt-1.5 flex items-center gap-1', change > 0 ? 'text-emerald-600' : 'text-red-600')}>
          {change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(change)}{typeof change === 'number' && !String(value).includes('%') ? '%' : ''} {changePrefix || ''}
        </p>
      ) : subtitle ? (
        <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>
      ) : null}
      {href && (
        <div className="flex items-center text-xs font-medium text-slate-400 group-hover:text-primary-600 transition-colors mt-1.5">
          View details <ArrowRight className="h-3 w-3 ml-1" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return <>{content}</>;
}
