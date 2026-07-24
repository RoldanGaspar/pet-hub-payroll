import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, MapPin, Phone, Users, Settings, Clock, Calendar,
  AlertTriangle, ShieldOff, RefreshCw, ArrowLeft,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { branchApi } from '../utils/api';
import { formatCurrency, cn } from '../utils/helpers';
import { BRANCH_TYPE_LABELS, type BranchType } from '../types';

export default function BranchDetails() {
  const { branchId } = useParams<{ branchId: string }>();
  const id = parseInt(branchId || '0');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'settings'>('overview');
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newWorkingDays, setNewWorkingDays] = useState<number>(22);
  const [newWorkingHours, setNewWorkingHours] = useState<number>(8);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branch', id],
    queryFn: () => branchApi.getById(id).then(r => r.data),
    enabled: id > 0,
  });

  const impactQuery = useQuery({
    queryKey: ['branch-impact', id, newWorkingDays, newWorkingHours],
    queryFn: () => branchApi.impact(id, newWorkingDays, newWorkingHours).then(r => r.data),
    enabled: showSettingsDialog && newWorkingDays > 0,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => branchApi.deactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branch', id] }); setShowDeactivateDialog(false); },
  });

  const settingsMutation = useMutation({
    mutationFn: () => branchApi.updatePayrollSettings(id, { workingDaysPerMonth: newWorkingDays, workingHoursPerDay: newWorkingHours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch', id] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowSettingsDialog(false);
      setConfirmChecked(false);
    },
  });

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'employees' as const, label: `Employees (${branch?.employeeCount || 0})` },
    { key: 'settings' as const, label: 'Payroll Settings' },
  ];

  if (isLoading) {
    return <><Header title="Branch Details" /><div className="p-6"><div className="animate-pulse h-64 bg-slate-200 rounded-xl" /></div></>;
  }

  return (
    <>
      <Header title={branch?.name || 'Branch Details'} subtitle="Branch management & payroll settings" />

      <div className="p-6">
        <Link to="/branches" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Branches
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Status banner */}
          {!branch?.isActive && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">This branch is deactivated</span>
              </div>
              <button onClick={() => { branchApi.reactivate(id).then(() => queryClient.invalidateQueries({ queryKey: ['branch', id] })); }} className="btn-secondary text-sm py-1">
                <RefreshCw className="h-4 w-4" /> Reactivate
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Branch Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard icon={MapPin} label="Address" value={branch?.address || '-'} />
                    <InfoCard icon={Phone} label="Contact" value={branch?.contact || '-'} />
                    <InfoCard icon={Building2} label="Type" value={branch?.type ? BRANCH_TYPE_LABELS[branch.type as BranchType] : '-'} />
                    <InfoCard icon={ShieldOff} label="Status" value={branch?.isActive ? 'Active' : 'Inactive'} />
                  </div>

                  <div className="flex gap-3 pt-4">
                    {branch?.isActive && (
                      <button onClick={() => setShowDeactivateDialog(true)} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm">
                        <ShieldOff className="h-4 w-4" /> Deactivate Branch
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Payroll Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard icon={Calendar} label="Working Days/Month" value={`${branch?.workingDaysPerMonth} days`} />
                    <InfoCard icon={Clock} label="Working Hours/Day" value={`${branch?.workingHoursPerDay} hours`} />
                    <InfoCard icon={Users} label="Active Employees" value={String(branch?.employeeCount || 0)} />
                    <InfoCard icon={Settings} label="Rate Formula" value={branch?.workingDaysPerMonth === 22 ? 'Standard (22 days)' : `Custom (${branch?.workingDaysPerMonth} days)`} />
                  </div>
                  <button onClick={() => {
                    setNewWorkingDays(branch?.workingDaysPerMonth || 22);
                    setNewWorkingHours(branch?.workingHoursPerDay || 8);
                    setShowSettingsDialog(true);
                  }} className="btn-secondary text-sm">
                    <Settings className="h-4 w-4" /> Change Payroll Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Active Employees ({branch?.employeeCount || 0})
                  </h3>
                  <Link to={`/employees?branchId=${id}`} className="text-sm text-primary-600 hover:underline">
                    View all in Employees →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Payroll Settings History</h3>
                <p className="text-sm text-slate-500">Audit trail for payroll configuration changes will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deactivate Dialog */}
      {showDeactivateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Deactivate Branch?</h3>
            <p className="text-sm text-slate-600 mb-4">
              {branch?.employeeCount && branch.employeeCount > 0
                ? `This branch has ${branch.employeeCount} active employees. Transfer or deactivate them first.`
                : 'This branch has no active employees. It can be safely deactivated.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeactivateDialog(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => deactivateMutation.mutate()}
                disabled={(branch?.employeeCount || 0) > 0}
                className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Settings Dialog */}
      {showSettingsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Change Payroll Settings</h3>
            <p className="text-sm text-amber-600 flex items-center gap-1 mb-4">
              <AlertTriangle className="h-4 w-4" /> These settings affect employee rate calculations
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label">Working Days Per Month</label>
                <input type="number" min={1} max={31} value={newWorkingDays}
                  onChange={e => setNewWorkingDays(parseInt(e.target.value) || 22)} className="input" />
              </div>
              <div>
                <label className="label">Working Hours Per Day</label>
                <input type="number" min={1} max={24} value={newWorkingHours}
                  onChange={e => setNewWorkingHours(parseInt(e.target.value) || 8)} className="input" />
              </div>
            </div>

            {impactQuery.data && impactQuery.data.hasChanges && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-amber-800 mb-2">
                  {impactQuery.data.affectedEmployeeCount} employee(s) will have their rates recalculated
                </p>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>Before: {impactQuery.data.formulaDescription?.before}</p>
                  <p>After: {impactQuery.data.formulaDescription?.after}</p>
                </div>
                {impactQuery.data.employees && (
                  <div className="mt-3 max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-amber-800">
                          <th className="py-1">Employee</th>
                          <th className="py-1">Method</th>
                          <th className="py-1">Old Rate/Day</th>
                          <th className="py-1">New Rate/Day</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impactQuery.data.employees.map((e: any) => (
                          <tr key={e.id} className="border-t border-amber-200">
                            <td className="py-1">{e.name}</td>
                            <td className="py-1">{e.calculationMethod === 'MONTHLY' ? 'Monthly' : 'Annual'}</td>
                            <td className="py-1">{formatCurrency(e.oldRatePerDay)}</td>
                            <td className={`py-1 font-medium ${e.dayRateChanged ? 'text-amber-700' : 'text-slate-500'}`}>{formatCurrency(e.newRatePerDay)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={confirmChecked} onChange={e => setConfirmChecked(e.target.checked)} className="mt-1" />
              <span className="text-sm text-slate-600">I understand that changing payroll settings will update rates for all active employees in this branch.</span>
            </label>

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowSettingsDialog(false); setConfirmChecked(false); }} className="btn-secondary">Cancel</button>
              <button
                onClick={() => settingsMutation.mutate()}
                disabled={!confirmChecked || settingsMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {settingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
