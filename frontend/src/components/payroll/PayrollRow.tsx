import { Fragment } from 'react';
import { Calculator, ChevronDown, ChevronUp, Edit3, FileText, LockKeyhole, Trash2, UnlockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PayrollPeriod, POSITION_LABELS, STATUS_LABELS } from '../../types';
import { formatCurrency, getStatusColor } from '../../utils/helpers';
import { detectExceptions } from '../../hooks/usePayrollFilters';
import PayrollRowDetails from './PayrollRowDetails';

interface PayrollRowProps {
  payroll: PayrollPeriod;
  expanded: boolean;
  selected: boolean;
  isAdmin: boolean;
  onToggleExpand: () => void;
  onToggleSelected: () => void;
  onFieldUpdate: (payrollId: number, field: string, value: unknown) => void;
  onOpenIncentiveModal: (payroll: PayrollPeriod) => void;
  onApplyFixedDeductions: (payrollId: number) => void;
  onCalculate: (id: number) => void;
  onDelete: (payroll: PayrollPeriod) => void;
  onReopen: (payroll: PayrollPeriod) => void;
  isDeleting?: boolean;
}

const isLocked = (payroll: PayrollPeriod) => payroll.status === 'APPROVED' || payroll.status === 'PAID';

export default function PayrollRow({
  payroll, expanded, selected, isAdmin, onToggleExpand, onToggleSelected, onFieldUpdate,
  onOpenIncentiveModal, onApplyFixedDeductions, onCalculate, onDelete, onReopen, isDeleting,
}: PayrollRowProps) {
  const locked = isLocked(payroll);
  const exceptions = detectExceptions(payroll);

  return (
    <Fragment>
      <tr className={`cursor-pointer transition-colors hover:bg-slate-50 ${exceptions.length ? 'bg-amber-50/50' : ''}`} onClick={onToggleExpand}>
        <td onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" aria-label={`Select ${payroll.employee?.name || 'payroll'}`} /></td>
        <td>{expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}</td>
        <td><div><p className="font-medium text-slate-900">{payroll.employee?.name}</p><p className="text-xs text-slate-500">{POSITION_LABELS[payroll.employee?.position || 'STAFF']}</p>{locked && <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500"><LockKeyhole className="h-3 w-3" /> Finalized</p>}</div></td>
        <td><div className="text-sm"><span className="font-medium text-primary-600">{payroll.totalDaysPresent}</span><span className="text-slate-400"> / {payroll.workingDays} days</span><div className="mt-0.5 space-x-2 text-[11px] text-slate-500">{Number(payroll.overtimeHours) > 0 && <span className="text-orange-600">OT: {payroll.overtimeHours}h</span>}{Number(payroll.lateMinutes) > 0 && <span className="text-red-500">Late: {payroll.lateMinutes}m</span>}</div></div></td>
        <td><span className="font-semibold text-slate-800">{formatCurrency(payroll.grossPay)}</span>{payroll.totalIncentives > 0 && <span className="ml-1.5 text-[10px] font-medium text-emerald-700">+ Inc</span>}</td>
        <td><span className="font-semibold text-red-600">{formatCurrency(payroll.totalDeductions)}</span></td>
        <td><span className={`text-lg font-bold ${payroll.netPay >= 0 ? 'text-primary-600' : 'text-red-600'}`}>{formatCurrency(payroll.netPay)}</span></td>
        <td><span className={`badge ${getStatusColor(payroll.status)}`}>{STATUS_LABELS[payroll.status]}</span></td>
        <td onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-1">
          {!locked && <><button onClick={() => onOpenIncentiveModal(payroll)} className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600" title="Edit incentives"><Edit3 className="h-4 w-4" /></button><button onClick={() => onCalculate(payroll.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Recalculate"><Calculator className="h-4 w-4" /></button></>}
          <Link to={`/payslips/${payroll.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="View payslip"><FileText className="h-4 w-4" /></Link>
          {locked && isAdmin && <button onClick={() => onReopen(payroll)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Unlock / Re-open payroll"><UnlockKeyhole className="h-4 w-4" /></button>}
          {!locked && <button onClick={() => onDelete(payroll)} disabled={isDeleting} className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600" title="Delete payroll"><Trash2 className="h-4 w-4" /></button>}
        </div></td>
      </tr>
      {expanded && <tr className="bg-slate-50"><PayrollRowDetails payroll={payroll} isLocked={locked} onFieldUpdate={onFieldUpdate} onOpenIncentiveModal={onOpenIncentiveModal} onApplyFixedDeductions={onApplyFixedDeductions} /></tr>}
    </Fragment>
  );
}
