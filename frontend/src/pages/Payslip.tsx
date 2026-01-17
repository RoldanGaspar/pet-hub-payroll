import { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Printer } from 'lucide-react';
import Header from '../components/layout/Header';
import { payrollApi } from '../utils/api';
import { POSITION_LABELS, INCENTIVE_LABELS, DEDUCTION_LABELS, type PositionType } from '../types';
import { formatCurrency, formatDate, formatDateRange } from '../utils/helpers';

export default function Payslip() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: payroll, isLoading } = useQuery({
    queryKey: ['payroll', id],
    queryFn: () => payrollApi.getById(parseInt(id!)).then((res) => res.data),
    enabled: !!id,
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payslip-${payroll?.employee?.name}-${formatDate(payroll?.startDate || '', 'MMM-dd-yyyy')}`,
  });

  if (isLoading) {
    return (
      <>
        <Header title="Payslip" />
        <div className="p-6">
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </>
    );
  }

  if (!payroll) {
    return (
      <>
        <Header title="Payslip" />
        <div className="p-6">
          <div className="card p-8 text-center">
            <p className="text-slate-500">Payroll not found</p>
            <Link to="/payroll" className="btn-primary mt-4">
              Back to Payroll
            </Link>
          </div>
        </div>
      </>
    );
  }

  const employee = payroll.employee;
  const branch = employee?.branch;

  return (
    <>
      <Header title="Payslip" subtitle={employee?.name} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6 no-print">
          <Link to="/payroll" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to Payroll
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePrint()} className="btn-primary">
              <Printer className="h-4 w-4" />
              Print Payslip
            </button>
          </div>
        </div>

        {/* Payslip Document */}
        <div ref={printRef} className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-none">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8 border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Pet Hub Veterinary Clinic</h1>
                <p className="text-slate-600 mt-1">{branch?.address}</p>
                <p className="text-slate-600">{branch?.contact}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-900">
                  {formatDateRange(payroll.startDate, payroll.endDate)}
                </p>
                <p className="text-slate-600 mt-1">Regular Payroll</p>
                <p className="text-slate-500 text-sm">Veterinary Services</p>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Name:</span>
                  <span className="font-medium text-slate-900">{employee?.name}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Position:</span>
                  <span className="text-slate-700">{POSITION_LABELS[(employee?.position || 'STAFF') as PositionType]}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Salary:</span>
                  <span className="text-slate-700">{formatCurrency(employee?.salary || 0)}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Daily Rate:</span>
                  <span className="text-slate-700">{formatCurrency(employee?.ratePerDay || 0)}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Rate/Hour:</span>
                  <span className="text-slate-700">{formatCurrency(employee?.ratePerHour || 0)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Address:</span>
                  <span className="text-slate-700">{employee?.address || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">SSS:</span>
                  <span className="text-slate-700">{employee?.sssNo || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">TIN:</span>
                  <span className="text-slate-700">{employee?.tinNo || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">PhilHealth:</span>
                  <span className="text-slate-700">{employee?.philhealthNo || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 text-sm">Pag-IBIG:</span>
                  <span className="text-slate-700">{employee?.pagibigNo || '-'}</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* Income */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">INCOME</h3>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Basic Pay:</span>
                    <span className="font-medium">{formatCurrency(payroll.basicPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Overtime:</span>
                    <span className="font-medium">{formatCurrency(payroll.overtimePay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Holidays:</span>
                    <span className="font-medium">{formatCurrency(payroll.holidayPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Incentives:</span>
                    <span className="font-medium">{formatCurrency(payroll.totalIncentives)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Meal Allowance:</span>
                    <span className="font-medium">{formatCurrency(payroll.mealAllowance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">SIL:</span>
                    <span className="font-medium">{formatCurrency(payroll.silPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Birthday Leave:</span>
                    <span className="font-medium">{formatCurrency(payroll.birthdayLeave)}</span>
                  </div>
                </div>
              </div>

              {/* Days of Work */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">DAYS OF WORK</h3>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Working Days:</span>
                    <span className="font-medium">{payroll.workingDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Rest Day:</span>
                    <span className="font-medium">{payroll.dayOff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Absent:</span>
                    <span className="font-medium">{payroll.absences}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Holidays:</span>
                    <span className="font-medium">{payroll.holidays}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-600 font-medium">Total Days Present:</span>
                    <span className="font-bold">{payroll.totalDaysPresent}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">DEDUCTIONS</h3>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {payroll.deductions?.map((ded: any) => (
                    <div key={ded.id} className="flex justify-between">
                      <span className="text-slate-600">{DEDUCTION_LABELS[ded.type] || ded.type}:</span>
                      <span className="font-medium text-red-600">{formatCurrency(ded.amount)}</span>
                    </div>
                  ))}
                  {(!payroll.deductions || payroll.deductions.length === 0) && (
                    <p className="text-slate-400 text-center py-2">No deductions</p>
                  )}
                </div>
              </div>
            </div>

            {/* Incentives Detail */}
            {payroll.incentives && payroll.incentives.length > 0 && (
              <div className="mb-8">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">INCENTIVES BREAKDOWN</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      {payroll.incentives.map((inc: any) => (
                        <div key={inc.id} className="flex justify-between">
                          <span className="text-slate-600">{INCENTIVE_LABELS[inc.type] || inc.type}:</span>
                          <span className="font-medium">{formatCurrency(inc.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <p className="text-slate-500 text-sm">Gross Pay</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(payroll.grossPay)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-sm">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(payroll.totalDeductions)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-sm">Net Pay</p>
                  <p className="text-3xl font-bold text-primary-600">{formatCurrency(payroll.netPay)}</p>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-200">
              <div className="text-center">
                <div className="h-16 border-b border-slate-300 mb-2"></div>
                <p className="font-medium text-slate-900">Princess Kyla Rosario</p>
                <p className="text-sm text-slate-500">Accounting Officer</p>
                <p className="text-xs text-slate-400 mt-1">Prepared by</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b border-slate-300 mb-2"></div>
                <p className="font-medium text-slate-900">Jeremiah L. Munoz, DVM</p>
                <p className="text-sm text-slate-500">Operations Manager</p>
                <p className="text-xs text-slate-400 mt-1">Noted and Approved by</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b border-slate-300 mb-2"></div>
                <p className="font-medium text-slate-900">{employee?.name}</p>
                <p className="text-sm text-slate-500">Employee</p>
                <p className="text-xs text-slate-400 mt-1">Conforme</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
