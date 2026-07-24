import { DistributionPreviewItem } from '../types';
import { formatCurrency } from '../utils/helpers';

interface DistributionPreviewPanelProps {
  preview: DistributionPreviewItem[];
  grandTotal: number;
  isLoading: boolean;
}

export default function DistributionPreviewPanel({
  preview,
  grandTotal,
  isLoading,
}: DistributionPreviewPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (grandTotal === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400 p-6">
          <p className="text-sm font-medium">No data entered yet</p>
          <p className="text-xs mt-1">Enter daily values in the grid to see distribution preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">Distribution Preview</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          How totals will be divided among eligible employees
        </p>
      </div>

      {/* Preview items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {preview.map((item) => (
          <div
            key={item.configKey}
            className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-900">{item.label}</h4>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                ₱{item.rate}/unit
              </span>
            </div>

            {/* Formula */}
            <div className="bg-indigo-50 rounded px-2.5 py-2 mb-2">
              <p className="text-xs font-mono text-indigo-700">
                ({item.total} × ₱{item.rate}) ÷ {item.numEligible} employees
              </p>
              <p className="text-xs font-bold text-indigo-800 mt-0.5">
                = {formatCurrency(item.perPerson)} / person
              </p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="text-center p-1.5 bg-slate-50 rounded">
                <p className="text-slate-500">Total</p>
                <p className="font-semibold text-slate-800">{item.total}</p>
              </div>
              <div className="text-center p-1.5 bg-slate-50 rounded">
                <p className="text-slate-500">Total Pay</p>
                <p className="font-semibold text-slate-800">{formatCurrency(item.totalPay)}</p>
              </div>
              <div className="text-center p-1.5 bg-emerald-50 rounded">
                <p className="text-emerald-600">Per Person</p>
                <p className="font-semibold text-emerald-700">{formatCurrency(item.perPerson)}</p>
              </div>
            </div>

            {/* Eligible employees */}
            {item.numEligible > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 mb-1">
                  Eligible ({item.numEligible}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.eligibleNames.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {item.numEligible === 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <span>⚠</span> No eligible employees
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Grand Total Footer */}
      <div className="p-4 border-t border-slate-200 bg-indigo-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Grand Total</span>
          <span className="text-lg font-bold text-indigo-700">
            {grandTotal.toFixed(1)} units
          </span>
        </div>
      </div>
    </div>
  );
}
