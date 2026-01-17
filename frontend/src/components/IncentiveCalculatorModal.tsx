import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calculator, Save } from 'lucide-react';
import { incentiveApi } from '../utils/api';
import { PayrollPeriod, IncentiveConfig, POSITION_LABELS, DEFAULT_INCENTIVE_RATES } from '../types';
import { formatCurrency } from '../utils/helpers';

interface IncentiveCalculatorModalProps {
  payroll: PayrollPeriod;
  onClose: () => void;
}

interface IncentiveInputState {
  type: string;
  count: number;
  inputValue: number;
}

export default function IncentiveCalculatorModal({ payroll, onClose }: IncentiveCalculatorModalProps) {
  const queryClient = useQueryClient();
  const [inputs, setInputs] = useState<IncentiveInputState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const position = payroll.employee?.position || 'STAFF';
  const ratePerDay = payroll.employee?.ratePerDay || 0;
  const ratePerHour = payroll.employee?.ratePerHour || 0;

  // Get incentive configs for this position
  const { data: configs } = useQuery({
    queryKey: ['incentive-config', position],
    queryFn: () => incentiveApi.getConfigForPosition(position).then((res) => res.data),
  });

  // Initialize inputs from existing incentives or configs
  useEffect(() => {
    if (configs && configs.length > 0) {
      const initialInputs: IncentiveInputState[] = configs.map((config: IncentiveConfig) => {
        // Find existing incentive for this type
        const existing = payroll.incentives?.find((inc) => inc.type === config.type);
        return {
          type: config.type,
          count: existing?.count || 0,
          inputValue: existing?.inputValue || 0,
        };
      });
      setInputs(initialInputs);
    }
  }, [configs, payroll.incentives]);

  // Calculate totals in real-time
  const calculations = useMemo(() => {
    if (!configs || !inputs.length) return { results: [], totalCount: 0, totalAmount: 0 };

    let totalCount = 0;
    let totalAmount = 0;

    const results = inputs.map((input) => {
      const config = configs.find((c: IncentiveConfig) => c.type === input.type);
      if (!config) return null;

      const rate = config.rate || DEFAULT_INCENTIVE_RATES[input.type]?.rate || 0;
      const formulaType = config.formulaType || DEFAULT_INCENTIVE_RATES[input.type]?.formulaType || 'COUNT_MULTIPLY';

      let amount = 0;
      let formula = '';

      if (formulaType === 'COUNT_MULTIPLY') {
        amount = input.count * rate;
        formula = `${input.count} × ₱${rate.toLocaleString()} = ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        totalCount += input.count;
      } else if (formulaType === 'PERCENT') {
        amount = input.inputValue * rate;
        const percentDisplay = (rate * 100).toFixed(0);
        formula = `₱${input.inputValue.toLocaleString()} × ${percentDisplay}% = ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      }

      totalAmount += amount;

      return {
        type: input.type,
        name: config.name || input.type,
        count: input.count,
        inputValue: input.inputValue,
        rate,
        formulaType,
        amount,
        formula,
        description: config.description,
      };
    }).filter(Boolean);

    return {
      results,
      totalCount,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }, [inputs, configs]);

  // Update input value
  const handleInputChange = (type: string, field: 'count' | 'inputValue', value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) =>
      prev.map((input) =>
        input.type === type ? { ...input, [field]: numValue } : input
      )
    );
  };

  // Save incentives
  const saveMutation = useMutation({
    mutationFn: () => {
      const incentivesToSave = inputs
        .filter((input) => input.count > 0 || input.inputValue > 0)
        .map((input) => ({
          type: input.type,
          count: input.count,
          inputValue: input.inputValue,
        }));
      return incentiveApi.bulkUpdate(payroll.id, incentivesToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      onClose();
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-semibold">Incentive Calculator</h2>
                  <p className="text-primary-100 text-sm">{payroll.employee?.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Employee Info */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-primary-200">Position</p>
                <p className="font-medium">{POSITION_LABELS[position] || position}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-primary-200">Rate/Day</p>
                <p className="font-medium">{formatCurrency(ratePerDay)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-primary-200">Rate/Hour</p>
                <p className="font-medium">{formatCurrency(ratePerHour)}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!configs || configs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No incentive types available for this position.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium text-center">Input</th>
                      <th className="pb-3 font-medium text-center">Rate</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calculations.results.map((result: any) => {
                      const input = inputs.find((i) => i.type === result.type);
                      const isPercent = result.formulaType === 'PERCENT';
                      
                      return (
                        <tr key={result.type} className="group">
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-slate-900">{result.name}</p>
                              <p className="text-xs text-slate-500">{result.description}</p>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex justify-center">
                              {isPercent ? (
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₱</span>
                                  <input
                                    type="number"
                                    value={input?.inputValue || ''}
                                    onChange={(e) => handleInputChange(result.type, 'inputValue', e.target.value)}
                                    className="w-32 pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-right"
                                    placeholder="0"
                                  />
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.5"
                                  value={input?.count || ''}
                                  onChange={(e) => handleInputChange(result.type, 'count', e.target.value)}
                                  className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                                  placeholder="0"
                                />
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-sm text-slate-600">
                              {isPercent ? `× ${(result.rate * 100).toFixed(0)}%` : `× ₱${result.rate}`}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`font-medium ${result.amount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {formatCurrency(result.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-slate-50 p-6">
            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg border p-4 text-center">
                <p className="text-sm text-slate-500">Total Count</p>
                <p className="text-2xl font-bold text-slate-900">{calculations.totalCount}</p>
                <p className="text-xs text-slate-400">procedures</p>
              </div>
              <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4 text-center">
                <p className="text-sm text-emerald-600">Total Incentive Pay</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calculations.totalAmount)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
