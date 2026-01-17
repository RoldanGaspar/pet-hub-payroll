import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { payrollApi, branchApi } from '../utils/api';
import { PayrollPeriod, Branch, STATUS_LABELS, POSITION_LABELS } from '../types';
import { formatCurrency, formatDateRange, getStatusColor } from '../utils/helpers';

export default function Payslips() {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll().then((res) => res.data),
  });

  const { data: payrolls, isLoading } = useQuery({
    queryKey: ['payrolls', selectedBranch],
    queryFn: () =>
      payrollApi.getAll({ 
        branchId: selectedBranch ? parseInt(selectedBranch) : undefined,
        status: 'APPROVED'
      }).then((res) => res.data),
  });

  const filteredPayrolls = payrolls?.filter((p: PayrollPeriod) =>
    p.employee?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Header title="Payslips" subtitle="View and print employee payslips" />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee..."
                className="input pl-10"
              />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Branches</option>
              {branches?.map((branch: Branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredPayrolls && filteredPayrolls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPayrolls.map((payroll: PayrollPeriod) => (
              <Link
                key={payroll.id}
                to={`/payslips/${payroll.id}`}
                className="card p-6 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{payroll.employee?.name}</h3>
                      <p className="text-sm text-slate-500">
                        {POSITION_LABELS[payroll.employee?.position || 'STAFF']}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(payroll.status)}`}>
                    {STATUS_LABELS[payroll.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{formatDateRange(payroll.startDate, payroll.endDate)}</span>
                  </div>
                  <div className="text-slate-500">
                    {payroll.employee?.branch?.name}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Net Pay</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(payroll.netPay)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No payslips found</h3>
            <p className="text-slate-500">
              Approve payroll periods to generate payslips
            </p>
          </div>
        )}
      </div>
    </>
  );
}
