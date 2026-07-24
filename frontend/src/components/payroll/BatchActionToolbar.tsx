import { Calculator, CheckCircle2, Printer, X } from 'lucide-react';

interface BatchActionToolbarProps {
  count: number;
  isProcessing?: boolean;
  onRecalculate: () => void;
  onApprove: () => void;
  onPrint: () => void;
  onClear: () => void;
}

export default function BatchActionToolbar({
  count, isProcessing, onRecalculate, onApprove, onPrint, onClear,
}: BatchActionToolbarProps) {
  if (!count) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-100 px-2 text-primary-700">{count}</span>
          payroll record{count === 1 ? '' : 's'} selected
          <button onClick={onClear} className="ml-1 inline-flex items-center text-slate-400 hover:text-slate-700" title="Clear selection">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onRecalculate} disabled={isProcessing} className="btn-secondary text-sm">
            <Calculator className="h-4 w-4" /> Recalculate Selected ({count})
          </button>
          <button onClick={onApprove} disabled={isProcessing} className="btn-primary text-sm">
            <CheckCircle2 className="h-4 w-4" /> Approve Selected ({count})
          </button>
          <button onClick={onPrint} disabled={isProcessing} className="btn-secondary text-sm">
            <Printer className="h-4 w-4" /> Print Batch Payslips
          </button>
        </div>
      </div>
    </div>
  );
}
