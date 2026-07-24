import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
import { PayrollPeriod, POSITION_LABELS, type PositionType } from '../../types';
import { formatCurrency, formatDateRange } from '../../utils/helpers';

interface BulkPayslipModalProps {
  payrolls: PayrollPeriod[];
  onClose: () => void;
}

export default function BulkPayslipModal({ payrolls, onClose }: BulkPayslipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Pet-Hub-Payslips-${new Date().toISOString().slice(0, 10)}`,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Batch payslip printing">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Batch Payslips</h2>
            <p className="text-sm text-slate-500">{payrolls.length} payslip{payrolls.length === 1 ? '' : 's'} will be printed in one document.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-6">
          <div ref={printRef} className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-0">
            {payrolls.map((payroll) => <PrintablePayslip key={payroll.id} payroll={payroll} />)}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 no-print">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => handlePrint()} className="btn-primary"><Printer className="h-4 w-4" /> Print all payslips</button>
        </div>
      </div>
    </div>
  );
}

function PrintablePayslip({ payroll }: { payroll: PayrollPeriod }) {
  const employee = payroll.employee;
  const deductions = payroll.deductions || [];
  const incentives = payroll.incentives || [];

  return (
    <section className="break-after-page bg-white p-8 text-slate-900 shadow-sm print:min-h-screen print:break-after-page print:p-6 print:shadow-none" style={{ fontFamily: 'sans-serif' }}>
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="text-xl font-black uppercase">Pet Hub Veterinary Clinic</h1>
          <p className="text-sm">Employee Payslip</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold">{formatDateRange(payroll.startDate, payroll.endDate)}</p>
          <p>{employee?.branch?.name || 'Pet Hub Philippines'}</p>
        </div>
      </header>
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border-b border-slate-300 pb-4 text-sm">
        <p><span className="font-semibold">Employee:</span> {employee?.name || '—'}</p>
        <p><span className="font-semibold">Position:</span> {POSITION_LABELS[(employee?.position || 'STAFF') as PositionType]}</p>
        <p><span className="font-semibold">Daily rate:</span> {formatCurrency(employee?.ratePerDay || 0)}</p>
        <p><span className="font-semibold">Days present:</span> {payroll.totalDaysPresent} / {payroll.workingDays}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
        <section>
          <h2 className="border-b border-slate-900 pb-1 font-bold uppercase">Earnings</h2>
          <PayLine label="Basic pay" value={payroll.basicPay} />
          <PayLine label="Holiday pay" value={payroll.holidayPay} />
          <PayLine label="Overtime pay" value={payroll.overtimePay} />
          <PayLine label="Meal allowance" value={payroll.mealAllowance} />
          {incentives.map((item) => <PayLine key={item.id} label={item.type.replaceAll('_', ' ')} value={item.amount} />)}
          <PayLine strong label="Gross pay" value={payroll.grossPay} />
        </section>
        <section>
          <h2 className="border-b border-slate-900 pb-1 font-bold uppercase">Deductions</h2>
          {deductions.length ? deductions.map((item) => <PayLine key={item.id} label={item.type.replaceAll('_', ' ')} value={item.amount} />) : <p className="py-2 text-slate-500">No deductions</p>}
          <PayLine strong label="Total deductions" value={payroll.totalDeductions} />
        </section>
      </div>
      <div className="mt-6 flex items-center justify-between border-2 border-slate-900 bg-slate-100 px-4 py-3">
        <span className="font-bold uppercase">Net pay</span>
        <span className="text-xl font-black">{formatCurrency(payroll.netPay)}</span>
      </div>
      <footer className="mt-16 grid grid-cols-3 gap-8 text-center text-xs">
        {['Prepared by', 'Approved by', 'Received by'].map((label) => <div key={label}><div className="border-b border-slate-500" /><p className="mt-1">{label}</p></div>)}
      </footer>
    </section>
  );
}

function PayLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex justify-between border-b border-slate-200 py-1.5 ${strong ? 'mt-2 border-t border-slate-900 font-bold' : ''}`}><span className="capitalize">{label}</span><span>{formatCurrency(value || 0)}</span></div>;
}
