import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calculator, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/layout/Header';
import PeriodHeader from '../components/payroll/PeriodHeader';
import PayrollTable from '../components/payroll/PayrollTable';
import BatchActionToolbar from '../components/payroll/BatchActionToolbar';
import BulkPayslipModal from '../components/payroll/BulkPayslipModal';
import CreatePeriodModal from '../components/payroll/CreatePeriodModal';
import IncentiveCalculatorModal from '../components/payroll/IncentiveCalculatorModal';
import BranchIncentiveDrawer from '../components/payroll/BranchIncentiveDrawer';
import PayrollFilterBar from '../components/PayrollFilterBar';
import { payrollApi, branchApi, deductionApi } from '../utils/api';
import { Branch, PayrollPeriod } from '../types';
import { formatDateRange } from '../utils/helpers';
import { usePayrollFilters, PayrollFilterTab } from '../hooks/usePayrollFilters';
import { useAuth } from '../context/AuthContext';

type PayrollGroup = { startDate: string; endDate: string; payrolls: PayrollPeriod[] };

export default function Payroll() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedPayroll, setExpandedPayroll] = useState<number | null>(null);
  const [incentiveModalPayroll, setIncentiveModalPayroll] = useState<PayrollPeriod | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<PayrollFilterTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [batchError, setBatchError] = useState('');

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchApi.getAll().then((response) => response.data) });
  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ['payrolls', selectedBranch],
    queryFn: () => payrollApi.getAll({ branchId: selectedBranch ? parseInt(selectedBranch) : undefined }).then((response) => response.data),
  });

  const refreshPayrolls = () => queryClient.invalidateQueries({ queryKey: ['payrolls'] });
  const updatePayrollMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => payrollApi.update(id, data), onSuccess: refreshPayrolls });
  const calculatePayrollMutation = useMutation({ mutationFn: (id: number) => payrollApi.calculate(id), onSuccess: refreshPayrolls, onError: () => setBatchError('This payroll is finalized and must be re-opened before it can be recalculated.') });
  const applyFixedDeductionsMutation = useMutation({ mutationFn: (id: number) => deductionApi.applyFixed(id), onSuccess: refreshPayrolls, onError: () => setBatchError('This payroll is finalized and cannot be changed.') });
  const deletePayrollMutation = useMutation({ mutationFn: (id: number) => payrollApi.delete(id), onSuccess: refreshPayrolls, onError: () => setBatchError('The payroll could not be deleted. Finalized payrolls are locked.') });
  const calculateBatchMutation = useMutation({ mutationFn: (ids: number[]) => payrollApi.calculateBatch(ids), onSuccess: (response) => { refreshPayrolls(); setSelectedIds(new Set()); const skipped = response.data.skippedIds?.length || 0; setBatchError(skipped ? `${skipped} finalized or missing payroll record${skipped === 1 ? ' was' : 's were'} skipped.` : ''); }, onError: () => setBatchError('Unable to recalculate the selected payroll records.') });
  const approveBatchMutation = useMutation({ mutationFn: (ids: number[]) => payrollApi.approveBatch(ids), onSuccess: (response) => { refreshPayrolls(); setSelectedIds(new Set()); const skipped = response.data.skippedIds?.length || 0; setBatchError(skipped ? `${skipped} record${skipped === 1 ? ' was' : 's were'} already finalized or unavailable.` : ''); }, onError: () => setBatchError('Unable to approve the selected payroll records.') });
  const reopenMutation = useMutation({ mutationFn: (id: number) => payrollApi.reopen(id), onSuccess: refreshPayrolls, onError: () => setBatchError('Only an administrator can re-open a finalized payroll.') });

  const groupedPayrolls = useMemo(() => payrolls.reduce((groups: Record<string, PayrollGroup>, payroll: PayrollPeriod) => {
    const key = `${payroll.startDate}-${payroll.endDate}`;
    if (!groups[key]) groups[key] = { startDate: payroll.startDate, endDate: payroll.endDate, payrolls: [] };
    groups[key].payrolls.push(payroll);
    return groups;
  }, {}), [payrolls]);
  const { filterCounts, filterPayrolls } = usePayrollFilters(payrolls);
  const selectedPayrolls = payrolls.filter((payroll: PayrollPeriod) => selectedIds.has(payroll.id));
  const isProcessing = calculateBatchMutation.isPending || approveBatchMutation.isPending;

  const toggleSelected = (id: number) => setSelectedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = (items: PayrollPeriod[]) => setSelectedIds((current) => { const next = new Set(current); const allSelected = items.every((item) => next.has(item.id)); items.forEach((item) => allSelected ? next.delete(item.id) : next.add(item.id)); return next; });
  const handleFieldUpdate = (id: number, field: string, value: unknown) => updatePayrollMutation.mutate({ id, data: { [field]: Number(value) || 0 } });
  const handleDelete = (payroll: PayrollPeriod) => { if (window.confirm(`Delete payroll for ${payroll.employee?.name || 'this employee'} (${formatDateRange(payroll.startDate, payroll.endDate)})? This cannot be undone.`)) deletePayrollMutation.mutate(payroll.id); };
  const handleDeletePeriod = async (group: PayrollGroup) => {
    if (group.payrolls.some((payroll) => payroll.status === 'APPROVED' || payroll.status === 'PAID')) { setBatchError('This period contains finalized payrolls and cannot be deleted. Re-open the finalized records first.'); return; }
    if (!window.confirm(`Delete the ${group.payrolls.length} payroll records for ${formatDateRange(group.startDate, group.endDate)}? This cannot be undone.`)) return;
    try { await Promise.all(group.payrolls.map((payroll) => payrollApi.delete(payroll.id))); refreshPayrolls(); setExpandedPayroll(null); } catch { setBatchError('Unable to delete the payroll period.'); }
  };
  const handleReopen = (payroll: PayrollPeriod) => { if (window.confirm(`Re-open ${payroll.employee?.name || 'this'} payroll? It will return to Pending and become editable.`)) reopenMutation.mutate(payroll.id); };

  return <>
    <Header title="Payroll Calculator" subtitle="Calculate, finalize, and print employee payroll" />
    <div className="p-6 pb-28">
      <PeriodHeader branches={branches as Branch[]} selectedBranch={selectedBranch} onBranchChange={setSelectedBranch} onCreatePeriod={() => setIsCreateModalOpen(true)} />
      {batchError && <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{batchError}<button onClick={() => setBatchError('')} className="ml-auto text-amber-900 underline">Dismiss</button></div>}
      {isLoading ? <div className="card p-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" /></div> : Object.keys(groupedPayrolls).length ? <div className="space-y-6">{(Object.entries(groupedPayrolls) as Array<[string, PayrollGroup]>).map(([key, group]) => {
        const filtered = filterPayrolls(group.payrolls, activeFilterTab);
        if (!filtered.length) return null;
        return <section key={key} className="card border-l-4 border-l-primary-500"><div className="card-header bg-gradient-to-r from-slate-50 to-white"><div className="flex items-center justify-between gap-4"><div><h3 className="text-lg font-bold text-slate-900">{formatDateRange(group.startDate, group.endDate)}</h3><p className="mt-1 text-sm font-medium text-slate-600">{filtered.length} employee{filtered.length === 1 ? '' : 's'}{filtered.length < group.payrolls.length && <span className="ml-1 text-slate-400">(filtered from {group.payrolls.length})</span>}</p></div><div className="flex flex-wrap gap-2"><BranchIncentiveDrawer onOpen={() => navigate(`/payroll/incentive-sheet/${group.payrolls[0].id}`)} /><button onClick={() => handleDeletePeriod(group)} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" />Delete Period</button></div></div></div><div className="px-4 pt-3"><PayrollFilterBar activeTab={activeFilterTab} onTabChange={setActiveFilterTab} counts={filterCounts} /></div><PayrollTable payrolls={filtered} selectedIds={selectedIds} expandedPayroll={expandedPayroll} isAdmin={user?.role === 'ADMIN'} onToggleAll={toggleAll} onToggleSelected={toggleSelected} onToggleExpand={(id) => setExpandedPayroll((current) => current === id ? null : id)} onFieldUpdate={handleFieldUpdate} onOpenIncentiveModal={setIncentiveModalPayroll} onApplyFixedDeductions={(id) => applyFixedDeductionsMutation.mutate(id)} onCalculate={(id) => calculatePayrollMutation.mutate(id)} onDelete={handleDelete} onReopen={handleReopen} isDeleting={deletePayrollMutation.isPending} /></section>;
      })}</div> : <div className="card p-12 text-center"><Calculator className="mx-auto mb-4 h-12 w-12 text-slate-300" /><h3 className="mb-2 text-lg font-medium text-slate-900">No payroll periods</h3><p className="mb-4 text-slate-500">Create a new payroll period to get started</p><button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">Create Payroll Period</button></div>}
    </div>
    <BatchActionToolbar count={selectedIds.size} isProcessing={isProcessing} onClear={() => setSelectedIds(new Set())} onPrint={() => setIsBatchPrintOpen(true)} onRecalculate={() => calculateBatchMutation.mutate(Array.from(selectedIds))} onApprove={() => { if (window.confirm(`Approve and lock ${selectedIds.size} selected payroll record${selectedIds.size === 1 ? '' : 's'}? An administrator will be required to re-open them.`)) approveBatchMutation.mutate(Array.from(selectedIds)); }} />
    {isCreateModalOpen && <CreatePeriodModal branches={branches as Branch[]} onClose={() => setIsCreateModalOpen(false)} />}
    {incentiveModalPayroll && <IncentiveCalculatorModal payroll={incentiveModalPayroll} onClose={() => setIncentiveModalPayroll(null)} />}
    {isBatchPrintOpen && <BulkPayslipModal payrolls={selectedPayrolls} onClose={() => setIsBatchPrintOpen(false)} />}
  </>;
}
