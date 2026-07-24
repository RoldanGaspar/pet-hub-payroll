import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Edit3, Clock, Gift, MinusCircle } from 'lucide-react';
import { PayrollPeriod, INCENTIVE_LABELS } from '../types';
import { deductionApi } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import OptionalDeductions from './PayrollOptionalDeductions';
import EditableDeductions from './PayrollEditableDeductions';

type TabKey = 'attendance' | 'incentives' | 'deductions';

interface PayrollExpandedRowProps {
  payroll: PayrollPeriod;
  onFieldUpdate: (payrollId: number, field: string, value: any) => void;
  onOpenIncentiveModal: (payroll: PayrollPeriod) => void;
  onApplyFixedDeductions: (payrollId: number) => void;
}

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'attendance', label: 'Attendance & Rates', icon: <Clock className="h-4 w-4" /> },
  { key: 'incentives', label: 'Incentives', icon: <Gift className="h-4 w-4" /> },
  { key: 'deductions', label: 'Deductions', icon: <MinusCircle className="h-4 w-4" /> },
];

export default function PayrollExpandedRow({
  payroll,
  onFieldUpdate,
  onOpenIncentiveModal,
  onApplyFixedDeductions,
}: PayrollExpandedRowProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');

  return (
    <td colSpan={13} className="p-4">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-slate-200 mb-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all
                ${isActive
                  ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'attendance' && (
        <AttendanceTab payroll={payroll} onFieldUpdate={onFieldUpdate} />
      )}
      {activeTab === 'incentives' && (
        <IncentivesTab payroll={payroll} onOpenIncentiveModal={onOpenIncentiveModal} />
      )}
      {activeTab === 'deductions' && (
        <DeductionsTab
          payroll={payroll}
          onApplyFixedDeductions={onApplyFixedDeductions}
        />
      )}
    </td>
  );
}

/* ─── Tab 1: Attendance & Rates ─── */
function AttendanceTab({
  payroll,
  onFieldUpdate,
}: {
  payroll: PayrollPeriod;
  onFieldUpdate: (payrollId: number, field: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Salary Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-slate-500 mb-1">Monthly Salary</p>
          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(Number(payroll.employee?.salary || 0))}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-slate-500 mb-1">Rate per Day</p>
          <p className="text-lg font-semibold text-slate-700">
            {formatCurrency(payroll.employee?.ratePerDay || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-slate-500 mb-1">Rate per Hour</p>
          <p className="text-lg font-semibold text-slate-700">
            {formatCurrency(payroll.employee?.ratePerHour || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-slate-500 mb-1">Days Present</p>
          <p className="text-lg font-semibold text-primary-600">
            {payroll.totalDaysPresent} / {payroll.workingDays}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-slate-500 mb-1">Holiday Pay</p>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrency(payroll.holidayPay)}
          </p>
          {Number(payroll.holidays) > 0 && (
            <p className="text-[10px] text-slate-400 mt-1">
              {Number(payroll.holidays).toFixed(2)} × {formatCurrency(payroll.employee?.ratePerDay || 0)}
            </p>
          )}
        </div>
      </div>

      {/* Live Pay Breakdown */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-slate-200 p-4">
        <h5 className="font-semibold text-slate-900 mb-3 text-sm">Pay Breakdown</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Basic Pay</p>
            <p className="text-base font-bold text-primary-600">{formatCurrency(payroll.basicPay)}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {payroll.totalDaysPresent} days × {formatCurrency(payroll.employee?.ratePerDay || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Holiday Pay</p>
            <p className="text-base font-bold text-blue-600">{formatCurrency(payroll.holidayPay)}</p>
            {Number(payroll.holidays) > 0 ? (
              <p className="text-[10px] text-slate-400 mt-1">
                {Number(payroll.holidays).toFixed(2)} × {formatCurrency(payroll.employee?.ratePerDay || 0)}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">No holidays</p>
            )}
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Overtime Pay</p>
            <p className="text-base font-bold text-orange-600">{formatCurrency(payroll.overtimePay)}</p>
            {Number(payroll.overtimeHours) > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                {Number(payroll.overtimeHours)}h × {formatCurrency(payroll.employee?.ratePerHour || 0)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-500">Working Days</label>
          <input
            type="number"
            defaultValue={payroll.workingDays}
            onBlur={(e) => onFieldUpdate(payroll.id, 'workingDays', e.target.value)}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Day Off</label>
          <input
            type="number"
            defaultValue={payroll.dayOff}
            onBlur={(e) => onFieldUpdate(payroll.id, 'dayOff', e.target.value)}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Absences</label>
          <input
            type="number"
            defaultValue={payroll.absences}
            onBlur={(e) => onFieldUpdate(payroll.id, 'absences', e.target.value)}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Holidays</label>
          <input
            type="number"
            step="0.01"
            defaultValue={payroll.holidays ? Number(payroll.holidays).toFixed(2) : '0.00'}
            onBlur={(e) => {
              const value = e.target.value;
              const formattedValue = value ? parseFloat(value).toFixed(2) : '0.00';
              onFieldUpdate(payroll.id, 'holidays', formattedValue);
              e.target.value = formattedValue;
            }}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">OT Hours</label>
          <input
            type="number"
            step="0.5"
            defaultValue={payroll.overtimeHours}
            onBlur={(e) => onFieldUpdate(payroll.id, 'overtimeHours', e.target.value)}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Late (mins)</label>
          <input
            type="number"
            defaultValue={payroll.lateMinutes}
            onBlur={(e) => onFieldUpdate(payroll.id, 'lateMinutes', e.target.value)}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Meal Allowance</label>
          <input
            type="number"
            defaultValue={payroll.mealAllowance}
            onBlur={(e) => onFieldUpdate(payroll.id, 'mealAllowance', e.target.value)}
            className="input text-sm"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 2: Incentives ─── */
function IncentivesTab({
  payroll,
  onOpenIncentiveModal,
}: {
  payroll: PayrollPeriod;
  onOpenIncentiveModal: (payroll: PayrollPeriod) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Incentive Breakdown</h4>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-emerald-600">
            {formatCurrency(payroll.totalIncentives)}
          </span>
          <button
            onClick={() => onOpenIncentiveModal(payroll)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Incentives
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {payroll.incentives?.map((inc) => (
          <div key={inc.id} className="flex flex-col text-sm p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{INCENTIVE_LABELS[inc.type] || inc.type}</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(inc.amount)}</span>
            </div>
            {inc.formula && (
              <span className="text-xs text-slate-500 mt-1">{inc.formula}</span>
            )}
          </div>
        ))}
        {(!payroll.incentives || payroll.incentives.length === 0) && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">No incentives yet</p>
            <button
              onClick={() => onOpenIncentiveModal(payroll)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Incentives
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab 3: Deductions ─── */
function DeductionsTab({
  payroll,
  onApplyFixedDeductions,
}: {
  payroll: PayrollPeriod;
  onApplyFixedDeductions: (payrollId: number) => void;
}) {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      {/* Cash Advance */}
      <div>
        <h5 className="font-semibold text-slate-900 text-sm mb-2">
          Cash Advance
          <span className="text-xs font-normal text-slate-500 ml-2">(Optional)</span>
        </h5>
        <OptionalDeductions payroll={payroll} onUpdate={() => {}} />
      </div>

      {/* Deduction Divisor */}
      <div className="flex items-center gap-2 bg-amber-50 rounded border border-amber-200 p-2.5">
        <label className="text-xs font-medium text-amber-800 whitespace-nowrap">Divide by:</label>
        <select
          defaultValue={payroll.deductionDivisor || 2}
          onChange={(e) => {
            const newDivisor = parseInt(e.target.value);
            deductionApi.updateDivisor(payroll.id, newDivisor).then(() => {
              queryClient.invalidateQueries({ queryKey: ['payrolls'] });
            });
          }}
          className="input text-sm py-1 w-16"
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
        <span className="text-xs text-amber-700">
          {payroll.deductionDivisor === 1 ? '(Monthly)' :
           payroll.deductionDivisor === 2 || !payroll.deductionDivisor ? '(Semi-monthly)' :
           payroll.deductionDivisor === 4 ? '(Weekly)' : ''}
        </span>
      </div>

      {/* Fixed Deductions */}
      <div>
        <h5 className="font-semibold text-slate-900 text-sm mb-2">
          Fixed Deductions
          <span className="text-xs font-normal text-slate-500 ml-2">(Government, Insurance, Others)</span>
        </h5>
        <EditableDeductions payroll={payroll} onUpdate={() => {}} />
      </div>

      {/* Load Fixed Deductions Button */}
      <button
        onClick={() => {
          const divisor = payroll.deductionDivisor || 2;
          if (window.confirm(`This will load the employee's fixed deductions ÷ ${divisor} into this payroll. Continue?`)) {
            onApplyFixedDeductions(payroll.id);
          }
        }}
        className="btn-secondary w-full text-sm"
        title="Load deductions from Employees page settings, divided by divisor"
      >
        Load Fixed Deductions ÷ {payroll.deductionDivisor || 2}
      </button>
      <p className="text-xs text-slate-400 text-center">
        Loads employee's full deductions ÷ {payroll.deductionDivisor || 2} (semi-monthly)
      </p>
    </div>
  );
}
