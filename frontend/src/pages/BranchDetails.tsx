import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, MapPin, Phone, Users, Settings, Clock, Calendar,
  AlertTriangle, ShieldOff, RefreshCw,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '../components/layout/Header';
import { branchApi, employeeApi } from '../utils/api';
import { formatCurrency, cn } from '../utils/helpers';
import { BRANCH_TYPE_LABELS, POSITION_LABELS, type BranchType, type Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function BranchDetails() {
  const { branchId } = useParams<{ branchId: string }>();
  const id = parseInt(branchId || '0');
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';

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

  const employeesQuery = useQuery({
    queryKey: ['employees', { branchId: id }],
    queryFn: () => employeeApi.getAll(id).then(r => r.data),
    enabled: activeTab === 'employees' && id > 0,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => branchApi.deactivate(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['branch', id] });
      const prev = queryClient.getQueryData(['branch', id]);
      queryClient.setQueryData(['branch', id], (old: any) => old ? { ...old, isActive: false } : old);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch', id] });
      toast.success('Branch deactivated successfully');
      setShowDeactivateDialog(false);
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['branch', id], ctx.prev);
      toast.error(err.response?.data?.error || 'Failed to deactivate branch');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => branchApi.reactivate(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['branch', id] });
      const prev = queryClient.getQueryData(['branch', id]);
      queryClient.setQueryData(['branch', id], (old: any) => old ? { ...old, isActive: true } : old);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch', id] });
      toast.success('Branch reactivated successfully');
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['branch', id], ctx.prev);
      toast.error(err.response?.data?.error || 'Failed to reactivate branch');
    },
  });

  const settingsMutation = useMutation({
    mutationFn: () => branchApi.updatePayrollSettings(id, {
      workingDaysPerMonth: newWorkingDays,
      workingHoursPerDay: newWorkingHours,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['branch', id] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success(`Payroll settings updated. ${res.data?.affectedEmployees || 0} employees recalculated.`);
      setShowSettingsDialog(false);
      setConfirmChecked(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update payroll settings');
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
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link to="/branches" className="hover:text-slate-700 transition-colors">Branches</Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-900 truncate">{branch?.name}</span>
        </nav>

        <Card>
          {!branch?.isActive && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">This branch is deactivated</span>
              </div>
              {isAdmin && (
                <Button variant="outline" onClick={() => reactivateMutation.mutate()} className="text-sm py-1">
                  <RefreshCw className="h-4 w-4" /> Reactivate
                </Button>
              )}
            </div>
          )}

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

                  {isAdmin && branch?.isActive && (
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setShowDeactivateDialog(true)} className="text-red-600 border-red-200 hover:bg-red-50 text-sm">
                        <ShieldOff className="h-4 w-4" /> Deactivate Branch
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Payroll Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard icon={Calendar} label="Working Days/Month" value={`${branch?.workingDaysPerMonth} days`} />
                    <InfoCard icon={Clock} label="Working Hours/Day" value={`${branch?.workingHoursPerDay} hours`} />
                    <InfoCard icon={Users} label="Active Employees" value={String(branch?.employeeCount || 0)} />
                    <InfoCard icon={Settings} label="Rate Formula" value={branch?.workingDaysPerMonth === 22 ? 'Standard (22 days)' : `Custom (${branch?.workingDaysPerMonth} days)`} />
                  </div>
                  {isAdmin && (
                    <Button variant="outline" onClick={() => {
                      setNewWorkingDays(branch?.workingDaysPerMonth || 22);
                      setNewWorkingHours(branch?.workingHoursPerDay || 8);
                      setShowSettingsDialog(true);
                    }} className="text-sm">
                      <Settings className="h-4 w-4" /> Change Payroll Settings
                    </Button>
                  )}
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
                {employeesQuery.isLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-slate-200 rounded-lg" />
                    ))}
                  </div>
                ) : employeesQuery.data && employeesQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Rate/Day</TableHead>
                          <TableHead>Rate/Hour</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeesQuery.data.slice(0, 10).map((emp: Employee) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium text-slate-900">{emp.name}</TableCell>
                            <TableCell className="text-slate-500">{POSITION_LABELS[emp.position]}</TableCell>
                            <TableCell>{formatCurrency(emp.salary)}</TableCell>
                            <TableCell>{formatCurrency(emp.ratePerDay)}</TableCell>
                            <TableCell>{formatCurrency(emp.ratePerHour)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {employeesQuery.data.length > 10 && (
                      <p className="text-sm text-slate-500 mt-3 text-center">
                        Showing 10 of {employeesQuery.data.length} employees
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-8 text-center">No active employees in this branch.</p>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-slate-900">Payroll Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-primary-600" />
                      <span className="font-medium text-slate-700">Working Days Per Month</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{branch?.workingDaysPerMonth}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Used for Monthly rate formula: Salary / D = Rate/Day
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-primary-600" />
                      <span className="font-medium text-slate-700">Working Hours Per Day</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{branch?.workingHoursPerDay}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Used for: Rate/Day / H = Rate/Hour
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">How Rates Are Calculated</h4>
                      <div className="text-sm text-blue-700 space-y-2">
                        <div className="p-2 bg-white/50 rounded">
                          <span className="font-medium">Monthly Method (Resident Vets):</span><br />
                          Rate/Day = Salary / {branch?.workingDaysPerMonth} days<br />
                          Rate/Hour = Rate/Day / {branch?.workingHoursPerDay} hours
                        </div>
                        <div className="p-2 bg-white/50 rounded">
                          <span className="font-medium">Annual Method (All others):</span><br />
                          Rate/Day = (Salary x 12) / 313 days<br />
                          Rate/Hour = Rate/Day / {branch?.workingHoursPerDay} hours
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button variant="outline"
                    onClick={() => {
                      setNewWorkingDays(branch?.workingDaysPerMonth || 22);
                      setNewWorkingHours(branch?.workingHoursPerDay || 8);
                      setShowSettingsDialog(true);
                    }}
                    className="text-sm"
                  >
                    <Settings className="h-4 w-4" /> Change Payroll Settings
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Deactivate Dialog */}
      {isAdmin && showDeactivateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Deactivate Branch?</h3>
            <p className="text-sm text-slate-600 mb-4">
              {branch?.employeeCount && branch.employeeCount > 0
                ? `This branch has ${branch.employeeCount} active employees. Transfer or deactivate them first.`
                : 'This branch has no active employees. It can be safely deactivated.'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>Cancel</Button>
              <Button
                onClick={() => deactivateMutation.mutate()}
                disabled={(branch?.employeeCount || 0) > 0}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Settings Dialog */}
      {isAdmin && showSettingsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Change Payroll Settings</h3>
            <p className="text-sm text-amber-600 flex items-center gap-1 mb-4">
              <AlertTriangle className="h-4 w-4" /> These settings affect employee rate calculations
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label">Working Days Per Month</label>
                <Input type="number" min={1} max={31} value={newWorkingDays}
                  onChange={e => setNewWorkingDays(parseInt(e.target.value) || 22)} />
              </div>
              <div>
                <label className="label">Working Hours Per Day</label>
                <Input type="number" min={1} max={24} value={newWorkingHours}
                  onChange={e => setNewWorkingHours(parseInt(e.target.value) || 8)} />
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
              <Button variant="outline" onClick={() => { setShowSettingsDialog(false); setConfirmChecked(false); }}>Cancel</Button>
              <Button
                onClick={() => settingsMutation.mutate()}
                disabled={!confirmChecked || settingsMutation.isPending}
                className="disabled:opacity-50"
              >
                {settingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
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
