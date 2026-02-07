import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calculator, FileText, ChevronDown, ChevronUp, Edit3, Table2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import IncentiveCalculatorModal from '../components/IncentiveCalculatorModal';
import IncentiveSheetModal from '../components/IncentiveSheetModal';
import { payrollApi, branchApi, deductionApi } from '../utils/api';
import { PayrollPeriod, Branch, STATUS_LABELS, POSITION_LABELS, INCENTIVE_LABELS } from '../types';
import { formatCurrency, formatDateRange, getStatusColor } from '../utils/helpers';

// Fixed deduction types to always show (in order)
const FIXED_DEDUCTION_TYPES = [
  { type: 'WTAX', name: 'W/Tax' },
  { type: 'SSS', name: 'SSS' },
  { type: 'PAGIBIG', name: 'Pag-IBIG' },
  { type: 'PHILHEALTH', name: 'PhilHealth' },
  { type: 'SUNLIFE', name: 'Sunlife' },
  { type: 'UNIFORM', name: 'Uniform' },
];

// Editable Deductions Component
function EditableDeductions({ 
  payroll, 
  onUpdate 
}: { 
  payroll: PayrollPeriod; 
  onUpdate: () => void;
}) {
  const [deductionValues, setDeductionValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Initialize values from existing deductions
  useEffect(() => {
    const values: Record<string, string> = {};
    FIXED_DEDUCTION_TYPES.forEach(({ type }) => {
      const existing = payroll.deductions?.find((d) => d.type === type);
      values[type] = existing ? String(existing.amount) : '0';
    });
    setDeductionValues(values);
  }, [payroll.deductions]);

  const handleValueChange = (type: string, value: string) => {
    setDeductionValues((prev) => ({ ...prev, [type]: value }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      // Build deductions array from current values
      const deductions = FIXED_DEDUCTION_TYPES.map(({ type }) => ({
        type,
        amount: parseFloat(deductionValues[type]) || 0,
      })).filter((d) => d.amount > 0);

      await deductionApi.bulkUpdate(payroll.id, deductions);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      onUpdate();
    } catch (error) {
      console.error('Failed to save deductions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total
  const total = FIXED_DEDUCTION_TYPES.reduce(
    (sum, { type }) => sum + (parseFloat(deductionValues[type]) || 0),
    0
  );

  // Select all text on focus for easy replacement
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="space-y-3">
      {FIXED_DEDUCTION_TYPES.map(({ type, name }) => (
        <div key={type} className="flex items-center justify-between bg-white rounded border p-2">
          <label className="text-sm font-medium text-slate-700 w-24">{name}</label>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-sm">₱</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={deductionValues[type] === '0' ? '' : deductionValues[type] || ''}
              onChange={(e) => handleValueChange(type, e.target.value)}
              onFocus={handleFocus}
              onBlur={handleSave}
              placeholder="0.00"
              className="input w-28 text-right text-sm py-1"
            />
          </div>
        </div>
      ))}
      
      {/* Total */}
      <div className="flex items-center justify-between bg-red-50 rounded border border-red-200 p-3 mt-4">
        <span className="font-semibold text-red-800">TOTAL</span>
        <span className="font-bold text-red-600 text-lg">{formatCurrency(total)}</span>
      </div>
      
      {isSaving && (
        <p className="text-xs text-slate-500 text-center">Saving...</p>
      )}
    </div>
  );
}

export default function Payroll() {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedPayroll, setExpandedPayroll] = useState<number | null>(null);
  const [incentiveModalPayroll, setIncentiveModalPayroll] = useState<PayrollPeriod | null>(null);
  const [incentiveSheetInfo, setIncentiveSheetInfo] = useState<{
    branchId: number;
    branchName: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    branchId: '',
    startDate: '',
    endDate: '',
    workingDays: '15',
  });

  const queryClient = useQueryClient();

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll().then((res) => res.data),
  });

  const { data: payrolls, isLoading } = useQuery({
    queryKey: ['payrolls', selectedBranch],
    queryFn: () =>
      payrollApi.getAll({ branchId: selectedBranch ? parseInt(selectedBranch) : undefined }).then((res) => res.data),
  });

  const createPeriodMutation = useMutation({
    mutationFn: (data: any) => payrollApi.createPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      setIsCreateModalOpen(false);
    },
  });

  const updatePayrollMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => payrollApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });

  const calculatePayrollMutation = useMutation({
    mutationFn: (id: number) => payrollApi.calculate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });

  const applyFixedDeductionsMutation = useMutation({
    mutationFn: (payrollId: number) => deductionApi.applyFixed(payrollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });

  const deletePayrollMutation = useMutation({
    mutationFn: (id: number) => payrollApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      // Close expanded view if the deleted payroll was expanded
      setExpandedPayroll(null);
    },
  });

  const handleDeletePayroll = (payroll: PayrollPeriod) => {
    const employeeName = payroll.employee?.name || 'this employee';
    const dateRange = formatDateRange(payroll.startDate, payroll.endDate);
    
    if (window.confirm(`Are you sure you want to delete the payroll period for ${employeeName} (${dateRange})?\n\nThis action cannot be undone.`)) {
      deletePayrollMutation.mutate(payroll.id);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPeriodMutation.mutate({
      branchId: parseInt(createForm.branchId),
      startDate: createForm.startDate,
      endDate: createForm.endDate,
      workingDays: parseInt(createForm.workingDays),
    });
  };

  const handleFieldUpdate = (payrollId: number, field: string, value: any) => {
    updatePayrollMutation.mutate({
      id: payrollId,
      data: { [field]: parseFloat(value) || 0 },
    });
  };

  const toggleExpand = (payrollId: number) => {
    setExpandedPayroll(expandedPayroll === payrollId ? null : payrollId);
  };

  // Group payrolls by date range
  const groupedPayrolls = payrolls?.reduce((acc: any, payroll: PayrollPeriod) => {
    const key = `${payroll.startDate}-${payroll.endDate}`;
    if (!acc[key]) {
      acc[key] = {
        startDate: payroll.startDate,
        endDate: payroll.endDate,
        payrolls: [],
      };
    }
    acc[key].payrolls.push(payroll);
    return acc;
  }, {});

  return (
    <>
      <Header title="Payroll Calculator" subtitle="Calculate and manage employee payroll" />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
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
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create Payroll Period
          </button>
        </div>

        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : groupedPayrolls && Object.keys(groupedPayrolls).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedPayrolls).map(([key, group]: [string, any]) => (
              <div key={key} className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {formatDateRange(group.startDate, group.endDate)}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {group.payrolls.length} employees
                      </p>
                    </div>
                    {/* Branch Incentive Sheet Button */}
                    {group.payrolls[0]?.employee?.branch && (
                      <button
                        onClick={() => {
                          const p = group.payrolls[0];
                          setIncentiveSheetInfo({
                            branchId: p.employee!.branch!.id,
                            branchName: p.employee!.branch!.name,
                            startDate: p.startDate.split('T')[0],
                            endDate: p.endDate.split('T')[0],
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Open branch-level daily incentive input sheet"
                      >
                        <Table2 className="h-4 w-4" />
                        Branch Incentive Sheet
                      </button>
                    )}
                  </div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="w-8"></th>
                        <th>Employee</th>
                        <th>Rate/Day</th>
                        <th>Rate/Hour</th>
                        <th>Days Present</th>
                        <th>Basic Pay</th>
                        <th>Holiday Pay</th>
                        <th>OT Pay</th>
                        <th>Incentives</th>
                        <th>Deductions</th>
                        <th>Net Pay</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.payrolls.map((payroll: PayrollPeriod) => (
                        <>
                          <tr key={payroll.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleExpand(payroll.id)}>
                            <td>
                              {expandedPayroll === payroll.id ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              )}
                            </td>
                            <td>
                              <div>
                                <p className="font-medium text-slate-900">{payroll.employee?.name}</p>
                                <p className="text-xs text-slate-500">
                                  {POSITION_LABELS[payroll.employee?.position || 'STAFF']}
                                </p>
                              </div>
                            </td>
                            <td className="text-sm text-slate-600">
                              {formatCurrency(payroll.employee?.ratePerDay || 0)}
                            </td>
                            <td className="text-sm text-slate-600">
                              {formatCurrency(payroll.employee?.ratePerHour || 0)}
                            </td>
                            <td>
                              <span className="font-medium text-primary-600">{payroll.totalDaysPresent}</span>
                              <span className="text-slate-400"> / {payroll.workingDays}</span>
                            </td>
                            <td className="font-medium">{formatCurrency(payroll.basicPay)}</td>
                            <td>
                              <span className="font-medium text-blue-600">{formatCurrency(payroll.holidayPay)}</span>
                              {Number(payroll.holidays) > 0 && (
                                <p className="text-[10px] text-slate-400">
                                  {Number(payroll.holidays)} × {formatCurrency(payroll.employee?.ratePerDay || 0)}
                                </p>
                              )}
                            </td>
                            <td>
                              <span className="font-medium text-orange-600">{formatCurrency(payroll.overtimePay)}</span>
                              {Number(payroll.overtimeHours) > 0 && (
                                <p className="text-[10px] text-slate-400">
                                  {Number(payroll.overtimeHours)}h × {formatCurrency(payroll.employee?.ratePerHour || 0)}
                                </p>
                              )}
                            </td>
                            <td className="text-emerald-600 font-medium">{formatCurrency(payroll.totalIncentives)}</td>
                            <td className="text-red-600 font-medium">{formatCurrency(payroll.totalDeductions)}</td>
                            <td className="font-bold text-primary-600">{formatCurrency(payroll.netPay)}</td>
                            <td>
                              <span className={`badge ${getStatusColor(payroll.status)}`}>
                                {STATUS_LABELS[payroll.status]}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setIncentiveModalPayroll(payroll)}
                                  className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                  title="Edit Incentives"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => calculatePayrollMutation.mutate(payroll.id)}
                                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                                  title="Recalculate"
                                >
                                  <Calculator className="h-4 w-4" />
                                </button>
                                <Link
                                  to={`/payslips/${payroll.id}`}
                                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                                  title="View Payslip"
                                >
                                  <FileText className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePayroll(payroll);
                                  }}
                                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete Payroll Period"
                                  disabled={deletePayrollMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedPayroll === payroll.id && (
                            <tr className="bg-slate-50">
                              <td colSpan={13} className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Attendance & Work */}
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-900">Attendance & Work</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs text-slate-500">Working Days</label>
                                        <input
                                          type="number"
                                          defaultValue={payroll.workingDays}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'workingDays', e.target.value)}
                                          className="input text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-500">Day Off</label>
                                        <input
                                          type="number"
                                          defaultValue={payroll.dayOff}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'dayOff', e.target.value)}
                                          className="input text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-500">Absences</label>
                                        <input
                                          type="number"
                                          defaultValue={payroll.absences}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'absences', e.target.value)}
                                          className="input text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-500">Holidays</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          defaultValue={payroll.holidays}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'holidays', e.target.value)}
                                          className="input text-sm"
                                        />
                                        {Number(payroll.holidays) > 0 && (
                                          <p className="text-[10px] text-blue-600 mt-1">
                                            = {formatCurrency(payroll.holidayPay)}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-500">OT Hours</label>
                                        <input
                                          type="number"
                                          step="0.5"
                                          defaultValue={payroll.overtimeHours}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'overtimeHours', e.target.value)}
                                          className="input text-sm"
                                        />
                                        {Number(payroll.overtimeHours) > 0 && (
                                          <p className="text-[10px] text-blue-600 mt-1">
                                            = {formatCurrency(payroll.overtimePay)}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-500">Late (mins)</label>
                                        <input
                                          type="number"
                                          defaultValue={payroll.lateMinutes}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'lateMinutes', e.target.value)}
                                          className="input text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-500">Meal Allowance</label>
                                        <input
                                          type="number"
                                          defaultValue={payroll.mealAllowance}
                                          onBlur={(e) => handleFieldUpdate(payroll.id, 'mealAllowance', e.target.value)}
                                          className="input text-sm"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Incentives */}
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-slate-900">Incentives</h4>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-emerald-600">
                                          {formatCurrency(payroll.totalIncentives)}
                                        </span>
                                        <button
                                          onClick={() => setIncentiveModalPayroll(payroll)}
                                          className="p-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                          title="Edit Incentives"
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {payroll.incentives?.map((inc) => (
                                        <div key={inc.id} className="flex flex-col text-sm p-2 bg-white rounded border">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">{INCENTIVE_LABELS[inc.type] || inc.type}</span>
                                            <span className="font-medium text-emerald-600">{formatCurrency(inc.amount)}</span>
                                          </div>
                                          {inc.formula && (
                                            <span className="text-xs text-slate-500 mt-1">{inc.formula}</span>
                                          )}
                                        </div>
                                      ))}
                                      {(!payroll.incentives || payroll.incentives.length === 0) && (
                                        <div className="text-center py-4">
                                          <p className="text-sm text-slate-500 mb-2">No incentives yet</p>
                                          <button
                                            onClick={() => setIncentiveModalPayroll(payroll)}
                                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                          >
                                            + Add Incentives
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Deductions - Editable */}
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-900">
                                      Fixed Deductions
                                      <span className="text-xs font-normal text-slate-500 ml-2">
                                        (Government, Insurance, Others)
                                      </span>
                                    </h4>
                                    
                                    {/* Deduction Divisor */}
                                    <div className="flex items-center gap-2 bg-amber-50 rounded border border-amber-200 p-2">
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

                                    <EditableDeductions 
                                      payroll={payroll} 
                                      onUpdate={() => {}} 
                                    />
                                    <button
                                      onClick={() => {
                                        const divisor = payroll.deductionDivisor || 2;
                                        if (window.confirm(`This will load the employee's fixed deductions ÷ ${divisor} into this payroll. Continue?`)) {
                                          applyFixedDeductionsMutation.mutate(payroll.id);
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
                                </div>

                                {/* Summary */}
                                <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-5 gap-4">
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">Basic Pay</p>
                                    <p className="font-semibold">{formatCurrency(payroll.basicPay)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {payroll.totalDaysPresent} days × {formatCurrency(payroll.employee?.ratePerDay || 0)}
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">Holiday Pay</p>
                                    <p className="font-semibold">{formatCurrency(payroll.holidayPay)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {Number(payroll.holidays)} × {formatCurrency(payroll.employee?.ratePerDay || 0)}
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">Overtime Pay</p>
                                    <p className="font-semibold">{formatCurrency(payroll.overtimePay)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {Number(payroll.overtimeHours)} hrs × {formatCurrency(payroll.employee?.ratePerHour || 0)}
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">Gross Pay</p>
                                    <p className="font-semibold">{formatCurrency(payroll.grossPay)}</p>
                                  </div>
                                  <div className="text-center p-3 bg-primary-50 rounded-lg border border-primary-200">
                                    <p className="text-xs text-primary-600">Net Pay</p>
                                    <p className="font-bold text-primary-700">{formatCurrency(payroll.netPay)}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No payroll periods</h3>
            <p className="text-slate-500 mb-4">Create a new payroll period to get started</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Create Payroll Period
            </button>
          </div>
        )}

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setIsCreateModalOpen(false)}></div>
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Create Payroll Period</h2>

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="label">Branch</label>
                    <select
                      value={createForm.branchId}
                      onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches?.map((branch: Branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Date</label>
                      <input
                        type="date"
                        value={createForm.startDate}
                        onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">End Date</label>
                      <input
                        type="date"
                        value={createForm.endDate}
                        onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Working Days</label>
                    <input
                      type="number"
                      value={createForm.workingDays}
                      onChange={(e) => setCreateForm({ ...createForm, workingDays: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={createPeriodMutation.isPending}>
                      Create Period
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Incentive Calculator Modal (per employee) */}
        {incentiveModalPayroll && (
          <IncentiveCalculatorModal
            payroll={incentiveModalPayroll}
            onClose={() => setIncentiveModalPayroll(null)}
          />
        )}

        {/* Branch Incentive Sheet Modal (daily grid) */}
        {incentiveSheetInfo && (
          <IncentiveSheetModal
            branchId={incentiveSheetInfo.branchId}
            branchName={incentiveSheetInfo.branchName}
            startDate={incentiveSheetInfo.startDate}
            endDate={incentiveSheetInfo.endDate}
            onClose={() => setIncentiveSheetInfo(null)}
          />
        )}
      </div>
    </>
  );
}
