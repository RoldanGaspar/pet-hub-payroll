import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { PayrollPeriod, DEDUCTION_LABELS } from '../types';
import { deductionApi } from '../utils/api';

export default function OptionalDeductions({
  payroll,
  onUpdate,
}: {
  payroll: PayrollPeriod;
  onUpdate: () => void;
}) {
  const [cashAdvanceAmount, setCashAdvanceAmount] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const cashAdvanceDeduction = payroll.deductions?.find(d => d.type === 'CASH_ADVANCE');

  useEffect(() => {
    setCashAdvanceAmount(cashAdvanceDeduction ? String(cashAdvanceDeduction.amount) : '');
  }, [cashAdvanceDeduction]);

  const handleSave = async (amount: string) => {
    if (isSaving) return;
    const amountValue = parseFloat(amount) || 0;
    setIsSaving(true);
    try {
      if (amountValue > 0) {
        await deductionApi.create({
          payrollId: payroll.id,
          type: 'CASH_ADVANCE',
          amount: amountValue,
        });
      } else if (cashAdvanceDeduction) {
        await deductionApi.delete(cashAdvanceDeduction.id);
      }
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll', payroll.id] });
      queryClient.refetchQueries({ queryKey: ['payrolls'] });
      queryClient.refetchQueries({ queryKey: ['payroll', payroll.id] });
      onUpdate();
    } catch (error) {
      console.error('Failed to save cash advance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deductionId: number) => {
    if (window.confirm('Remove cash advance deduction?')) {
      try {
        await deductionApi.delete(deductionId);
        queryClient.invalidateQueries({ queryKey: ['payrolls'] });
        queryClient.invalidateQueries({ queryKey: ['payroll', payroll.id] });
        queryClient.refetchQueries({ queryKey: ['payrolls'] });
        queryClient.refetchQueries({ queryKey: ['payroll', payroll.id] });
        onUpdate();
      } catch (error) {
        console.error('Failed to delete deduction:', error);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap w-24">
          {DEDUCTION_LABELS.CASH_ADVANCE}:
        </label>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-slate-400 text-xs">₱</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cashAdvanceAmount}
            onChange={(e) => setCashAdvanceAmount(e.target.value)}
            onBlur={() => handleSave(cashAdvanceAmount)}
            placeholder="0.00"
            className="input flex-1 text-xs py-1 h-7"
          />
          {cashAdvanceDeduction ? (
            <button
              onClick={() => handleDelete(cashAdvanceDeduction.id)}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              title="Remove Cash Advance"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (parseFloat(cashAdvanceAmount) > 0) {
                  handleSave(cashAdvanceAmount);
                }
              }}
              className="p-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors flex-shrink-0"
              title="Add Cash Advance"
              disabled={!cashAdvanceAmount || parseFloat(cashAdvanceAmount) <= 0}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {isSaving && (
        <p className="text-[10px] text-slate-400 text-center mt-1">Saving...</p>
      )}
    </div>
  );
}
