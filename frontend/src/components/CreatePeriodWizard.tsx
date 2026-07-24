import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { payrollApi } from '../utils/api';
import { Branch, PreflightData, POSITION_LABELS } from '../types';

interface CreatePeriodWizardProps {
  branches: Branch[];
  onClose: () => void;
}

type PeriodType = 'FIRST_HALF' | 'SECOND_HALF' | 'CUSTOM';

export default function CreatePeriodWizard({ branches, onClose }: CreatePeriodWizardProps) {
  const queryClient = useQueryClient();

  // Form state
  const [branchId, setBranchId] = useState<string>('');
  const [periodType, setPeriodType] = useState<PeriodType>('FIRST_HALF');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [workingDays, setWorkingDays] = useState<string>('15');

  // Pre-flight query — fetches when branch is selected
  const {
    data: preflight,
    isLoading: preflightLoading,
    isError: preflightError,
  } = useQuery<PreflightData>({
    queryKey: ['payroll-preflight', branchId],
    queryFn: () => payrollApi.getPreflight(parseInt(branchId)).then((res) => res.data),
    enabled: !!branchId,
  });

  // Auto-fill dates based on period type
  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    if (type === 'FIRST_HALF') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month, 15);
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
      setWorkingDays('15');
    } else if (type === 'SECOND_HALF') {
      const start = new Date(year, month, 16);
      const end = new Date(year, month + 1, 0); // Last day of month
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
      // Calculate working days (Mon-Sat, excluding Sundays)
      const wd = countWorkingDays(start, end);
      setWorkingDays(String(wd));
    }
    // CUSTOM: leave dates as-is for manual entry
  };

  // Create period mutation
  const createPeriodMutation = useMutation({
    mutationFn: (data: { branchId: number; startDate: string; endDate: string; workingDays: number }) =>
      payrollApi.createPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !startDate || !endDate) return;

    createPeriodMutation.mutate({
      branchId: parseInt(branchId),
      startDate,
      endDate,
      workingDays: parseInt(workingDays) || 15,
    });
  };

  const hasWarnings = preflight && preflight.warnings.length > 0;


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 border border-slate-200">
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Create Payroll Period</h2>
              <p className="text-sm text-slate-500 mt-1">Set up a new payroll period for employees</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Branch Selection */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Select Branch
              </h3>
              <select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  // Auto-set period type when branch is selected
                  if (e.target.value && !startDate) {
                    handlePeriodTypeChange(periodType);
                  }
                }}
                className="input w-full"
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

            {/* Step 2: Period Configuration */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Configure Period
              </h3>

              {/* Period Type Selector */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {([
                  { value: 'FIRST_HALF', label: '1st Half (1st–15th)' },
                  { value: 'SECOND_HALF', label: '2nd Half (16th–End)' },
                  { value: 'CUSTOM', label: 'Custom Range' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePeriodTypeChange(opt.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      periodType === opt.value
                        ? 'bg-primary-600 text-white border-primary-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-primary-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Working Days */}
              <div>
                <label className="label">Working Days</label>
                <input
                  type="number"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="input"
                  required
                  min="1"
                  max="31"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Default: 15 for 1st half, auto-calculated for 2nd half (Mon-Sat, excluding Sundays)
                </p>
              </div>
            </div>

            {/* Step 3: Pre-Flight Inspection */}
            {branchId && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Pre-Flight Inspection
                </h3>

                {preflightLoading ? (
                  <div className="flex items-center justify-center py-6 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Checking employee readiness...
                  </div>
                ) : preflightError ? (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">Failed to check employee readiness. Please try again.</span>
                  </div>
                ) : preflight ? (
                  <div className="space-y-3">
                    {/* Employee Count Banner */}
                    <div className={`flex items-center gap-2 rounded-lg p-3 ${
                      preflight.activeEmployeeCount > 0
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                      {preflight.activeEmployeeCount > 0 ? (
                        <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        {preflight.activeEmployeeCount > 0
                          ? `${preflight.activeEmployeeCount} Active Employee${preflight.activeEmployeeCount !== 1 ? 's' : ''} found in ${preflight.branchName}`
                          : `No active employees found in ${preflight.branchName}`}
                      </span>
                    </div>

                    {/* Warnings */}
                    {hasWarnings && (
                      <div className="space-y-2">
                        {preflight.warnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${
                              warning.type === 'missing_deduction'
                                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            {warning.type === 'missing_deduction' ? (
                              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                            )}
                            <span>{warning.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Employee Preview Table */}
                    {preflight.employees.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                          Employee Preview ({preflight.employees.length})
                        </p>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-slate-600">Name</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-600">Position</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-600">Salary</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-600">Rate/Day</th>
                                <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {preflight.employees.map((emp) => {
                                const hasIssues = emp.missingDeductions.length > 0 || emp.ratePerDay <= 0;
                                return (
                                  <tr key={emp.id} className={`hover:bg-slate-50 ${hasIssues ? 'bg-yellow-50/50' : ''}`}>
                                    <td className="px-3 py-2 font-medium text-slate-800">{emp.name}</td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {POSITION_LABELS[emp.position as keyof typeof POSITION_LABELS] || emp.position}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      ₱{emp.salary.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      ₱{emp.ratePerDay.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {hasIssues ? (
                                        <span className="inline-flex items-center gap-1 text-yellow-600" title={emp.missingDeductions.join(', ')}>
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          <span className="text-[10px]">Issues</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-green-600">
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          <span className="text-[10px]">Ready</span>
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          {preflight.employees.length} payroll period{preflight.employees.length !== 1 ? 's' : ''} will be created
                        </p>
                      </div>
                    )}

                    {/* Summary Info */}
                    {!hasWarnings && preflight.activeEmployeeCount > 0 && (
                      <div className="flex items-center gap-2 text-primary-700 bg-primary-50 rounded-lg p-3 border border-primary-200">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">
                          All employees have required deductions configured. Ready to create payroll periods.
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  !branchId ||
                  !startDate ||
                  !endDate ||
                  createPeriodMutation.isPending ||
                  (preflight && preflight.activeEmployeeCount === 0)
                }
              >
                {createPeriodMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create Period${preflight ? ` (${preflight.employees.length} employees)` : ''}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper: format Date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: count working days (Mon-Sat, excluding Sundays)
function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) count++; // 0 = Sunday
    current.setDate(current.getDate() + 1);
  }
  return count;
}
