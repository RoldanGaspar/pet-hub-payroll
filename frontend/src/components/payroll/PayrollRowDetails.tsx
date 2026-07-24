import { LockKeyhole } from 'lucide-react';
import PayrollExpandedRow from '../PayrollExpandedRow';
import { PayrollPeriod, INCENTIVE_LABELS } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface PayrollRowDetailsProps {
  payroll: PayrollPeriod;
  isLocked: boolean;
  onFieldUpdate: (payrollId: number, field: string, value: unknown) => void;
  onOpenIncentiveModal: (payroll: PayrollPeriod) => void;
  onApplyFixedDeductions: (payrollId: number) => void;
}

export default function PayrollRowDetails({ payroll, isLocked, ...props }: PayrollRowDetailsProps) {
  if (!isLocked) return <PayrollExpandedRow payroll={payroll} {...props} />;

  return (
    <td colSpan={9} className="p-4">
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <LockKeyhole className="h-4 w-4" /> Finalized payroll — values are locked and read-only.
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <StaticSection title="Attendance" values={[
            ['Working days', payroll.workingDays], ['Day off', payroll.dayOff], ['Absences', payroll.absences],
            ['Holidays', Number(payroll.holidays).toFixed(2)], ['Overtime', `${payroll.overtimeHours} hrs`], ['Late', `${payroll.lateMinutes} mins`],
          ]} />
          <StaticSection title="Incentives" values={(payroll.incentives || []).length ? (payroll.incentives || []).map((item) => [INCENTIVE_LABELS[item.type] || item.type, formatCurrency(item.amount)]) : [['No incentives', '—']]} />
          <StaticSection title="Deductions" values={(payroll.deductions || []).length ? (payroll.deductions || []).map((item) => [item.type.replace(/_/g, ' '), formatCurrency(item.amount)]) : [['No deductions', '—']]} />
        </div>
      </div>
    </td>
  );
}

function StaticSection({ title, values }: { title: string; values: Array<[string, string | number]> }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-3"><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4><div className="space-y-1.5 text-sm">{values.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><span className="capitalize text-slate-600">{label}</span><span className="font-medium text-slate-900">{value}</span></div>)}</div></section>;
}
