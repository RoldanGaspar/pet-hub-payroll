import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Calculator, Wallet, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { dashboardApi } from '../utils/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { STATUS_LABELS, BRANCH_TYPE_LABELS, type PayrollStatus, type BranchType } from '../types';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
  });

  if (isLoading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Welcome back! Here's what's happening." />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const statCards = [
    {
      label: 'Total Branches',
      value: stats?.totalBranches || 0,
      icon: Building2,
      color: 'bg-blue-500',
      href: '/branches',
    },
    {
      label: 'Active Employees',
      value: stats?.activeEmployees || 0,
      icon: Users,
      color: 'bg-emerald-500',
      href: '/employees',
    },
    {
      label: 'Pending Payrolls',
      value: stats?.pendingPayrolls || 0,
      icon: Calculator,
      color: 'bg-amber-500',
      href: '/payroll',
    },
    {
      label: 'Monthly Disbursement',
      value: formatCurrency(stats?.totalDisbursement || 0),
      icon: Wallet,
      color: 'bg-purple-500',
      href: '/payroll',
    },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Welcome back! Here's what's happening." />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.href}
              className="card p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                View details <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payrolls */}
          <div className="lg:col-span-2 card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent Payrolls</h3>
              <Link to="/payroll" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Branch</th>
                    <th>Period</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentPayrolls?.slice(0, 5).map((payroll: { id: number; employeeName: string; branchName: string; startDate: string; endDate: string; netPay: number; status: PayrollStatus }) => (
                    <tr key={payroll.id}>
                      <td className="font-medium text-slate-900">{payroll.employeeName}</td>
                      <td>{payroll.branchName}</td>
                      <td className="text-slate-500">
                        {formatDate(payroll.startDate, 'MMM dd')} - {formatDate(payroll.endDate, 'MMM dd')}
                      </td>
                      <td className="font-medium">{formatCurrency(payroll.netPay)}</td>
                      <td>
                        <span className={`badge ${getStatusColor(payroll.status)}`}>
                          {STATUS_LABELS[payroll.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentPayrolls || stats.recentPayrolls.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-500 py-8">
                        No recent payrolls
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Branch Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-900">Branch Summary</h3>
            </div>
            <div className="p-4 space-y-3">
              {stats?.branchSummaries?.map((branch: { id: number; name: string; type: BranchType; employeeCount: number; latestDisbursement: number }) => (
                <Link
                  key={branch.id}
                  to={`/branches/${branch.id}`}
                  className="block p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{branch.name}</h4>
                    <span className="text-xs text-slate-500">
                      {BRANCH_TYPE_LABELS[branch.type]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {branch.employeeCount} employees
                    </span>
                    <span className="font-medium text-primary-600">
                      {formatCurrency(branch.latestDisbursement)}
                    </span>
                  </div>
                </Link>
              ))}
              {(!stats?.branchSummaries || stats.branchSummaries.length === 0) && (
                <p className="text-center text-slate-500 py-8">No branches found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
