import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PayrollPeriod } from '../types';
import { deductionApi } from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const FIXED_DEDUCTION_TYPES = [
  { type: 'WTAX', name: 'W/Tax' },
  { type: 'SSS', name: 'SSS' },
  { type: 'PAGIBIG', name: 'Pag-IBIG' },
  { type: 'PHILHEALTH', name: 'PhilHealth' },
  { type: 'SUNLIFE', name: 'Sunlife' },
  { type: 'UNIFORM', name: 'Uniform' },
];

export default function EditableDeductions({
  payroll,
  onUpdate,
}: {
  payroll: PayrollPeriod;
  onUpdate: () => void;
}) {
  const [deductionValues, setDeductionValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const deductionTypesToShow = useMemo(() => {
    const types = new Set<string>();
    if (payroll.employee?.fixedDeductions) {
      payroll.employee.fixedDeductions.forEach((fd) => {
        if (fd.isActive) types.add(fd.type);
      });
    }
    if (payroll.deductions) {
      payroll.deductions.forEach((d) => types.add(d.type));
    }
    return Array.from(types).map((type) => {
      const typeInfo = FIXED_DEDUCTION_TYPES.find((t) => t.type === type);
      return { type, name: typeInfo?.name || type };
    }).sort((a, b) => {
      const aIndex = FIXED_DEDUCTION_TYPES.findIndex((t) => t.type === a.type);
      const bIndex = FIXED_DEDUCTION_TYPES.findIndex((t) => t.type === b.type);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [payroll.employee?.fixedDeductions, payroll.deductions]);

  useEffect(() => {
    const values: Record<string, string> = {};
    deductionTypesToShow.forEach(({ type }) => {
      const existing = payroll.deductions?.find((d) => d.type === type);
      values[type] = existing ? String(existing.amount) : '0';
    });
    setDeductionValues(values);
  }, [payroll.deductions, deductionTypesToShow]);

  const handleValueChange = (type: string, value: string) => {
    setDeductionValues((prev) => ({ ...prev, [type]: value }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const deductions = deductionTypesToShow.map(({ type }) => ({
        type,
        amount: parseFloat(deductionValues[type]) || 0,
      })).filter((d) => d.amount > 0);
      await deductionApi.bulkUpdate(payroll.id, deductions);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll', payroll.id] });
      queryClient.refetchQueries({ queryKey: ['payrolls'] });
      queryClient.refetchQueries({ queryKey: ['payroll', payroll.id] });
      onUpdate();
    } catch (error) {
      console.error('Failed to save deductions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const total = deductionTypesToShow.reduce(
    (sum, { type }) => sum + (parseFloat(deductionValues[type]) || 0), 0
  );

  const handleFocus = (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).select();
  };

  return (
    <div className="space-y-3">
      {deductionTypesToShow.length > 0 ? (
        deductionTypesToShow.map(({ type, name }) => (
          <div key={type} className="flex items-center justify-between bg-white rounded border p-2">
            <label className="text-sm font-medium text-slate-700 w-24">{name}</label>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-sm">₱</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deductionValues[type] === '0' ? '' : deductionValues[type] || ''}
                onChange={(e) => handleValueChange(type, e.target.value)}
                onFocus={handleFocus}
                onBlur={handleSave}
                placeholder="0.00"
                className="input w-28 text-right text-sm py-1"
              />
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">
          No fixed deductions configured. Add deductions in the Employees page.
        </p>
      )}
      <div className="flex items-center justify-between bg-red-50 rounded border border-red-200 p-3 mt-4">
        <span className="font-semibold text-red-800">TOTAL</span>
        <span className="font-bold text-red-600 text-lg">{formatCurrency(total)}</span>
      </div>
      {isSaving && (
        <p className="text-xs text-slate-500 text-center">Saving...</p>
      )}
    </div>
  );
}
