import { PayrollPeriod } from '../../types';
import PayrollRow from './PayrollRow';

interface PayrollTableProps {
  payrolls: PayrollPeriod[];
  selectedIds: Set<number>;
  expandedPayroll: number | null;
  isAdmin: boolean;
  onToggleAll: (payrolls: PayrollPeriod[]) => void;
  onToggleSelected: (id: number) => void;
  onToggleExpand: (id: number) => void;
  onFieldUpdate: (payrollId: number, field: string, value: unknown) => void;
  onOpenIncentiveModal: (payroll: PayrollPeriod) => void;
  onApplyFixedDeductions: (id: number) => void;
  onCalculate: (id: number) => void;
  onDelete: (payroll: PayrollPeriod) => void;
  onReopen: (payroll: PayrollPeriod) => void;
  isDeleting?: boolean;
}

export default function PayrollTable({ payrolls, selectedIds, expandedPayroll, isAdmin, onToggleAll, onToggleSelected, onToggleExpand, ...actions }: PayrollTableProps) {
  const allSelected = payrolls.length > 0 && payrolls.every((payroll) => selectedIds.has(payroll.id));
  return <div className="table-container"><table className="table"><thead><tr><th className="w-8"><input type="checkbox" checked={allSelected} onChange={() => onToggleAll(payrolls)} aria-label="Select all payroll records in this period" className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /></th><th className="w-8" /><th>Employee</th><th>Attendance & OT</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr></thead><tbody>{payrolls.map((payroll) => <PayrollRow key={payroll.id} payroll={payroll} selected={selectedIds.has(payroll.id)} expanded={expandedPayroll === payroll.id} isAdmin={isAdmin} onToggleSelected={() => onToggleSelected(payroll.id)} onToggleExpand={() => onToggleExpand(payroll.id)} {...actions} />)}</tbody></table></div>;
}
