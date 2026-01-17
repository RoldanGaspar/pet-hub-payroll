import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, RefreshCw, Info } from 'lucide-react';
import Header from '../components/layout/Header';
import { incentiveApi } from '../utils/api';
import { IncentiveConfig, POSITION_LABELS } from '../types';
import { formatCurrency } from '../utils/helpers';

export default function IncentiveConfigPage() {
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['incentive-config'],
    queryFn: () => incentiveApi.getConfig().then((res) => res.data),
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ type, rate }: { type: string; rate: number }) =>
      incentiveApi.updateConfig(type, { rate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-config'] });
      setEditingType(null);
      setEditValue('');
    },
  });

  const initConfigMutation = useMutation({
    mutationFn: () => incentiveApi.initConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-config'] });
    },
  });

  const handleEdit = (config: IncentiveConfig) => {
    setEditingType(config.type);
    setEditValue(String(config.rate));
  };

  const handleSave = (type: string) => {
    const rate = parseFloat(editValue);
    if (!isNaN(rate)) {
      updateConfigMutation.mutate({ type, rate });
    }
  };

  const handleCancel = () => {
    setEditingType(null);
    setEditValue('');
  };

  const formatRate = (config: IncentiveConfig) => {
    if (config.formulaType === 'PERCENT') {
      return `${(config.rate * 100).toFixed(0)}%`;
    }
    return formatCurrency(config.rate);
  };

  const getFormulaDisplay = (config: IncentiveConfig) => {
    if (config.formulaType === 'PERCENT') {
      return `Total Amount × ${(config.rate * 100).toFixed(0)}%`;
    }
    return `Count × ${formatCurrency(config.rate)}`;
  };

  return (
    <>
      <Header
        title="Incentive Configuration"
        subtitle="Manage incentive rates and formulas"
      />

      <div className="p-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900">Incentive Rate Configuration</h4>
            <p className="text-sm text-blue-700 mt-1">
              These rates are used to calculate employee incentives. Changes here will affect all future payroll calculations.
              The formulas show how each incentive type is calculated.
            </p>
          </div>
        </div>

        {/* Init button if no configs */}
        {configs && configs.length === 0 && (
          <div className="card p-8 text-center mb-6">
            <Settings className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Configurations Found</h3>
            <p className="text-slate-500 mb-4">Initialize the default incentive configurations to get started.</p>
            <button
              onClick={() => initConfigMutation.mutate()}
              className="btn-primary"
              disabled={initConfigMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${initConfigMutation.isPending ? 'animate-spin' : ''}`} />
              Initialize Default Configs
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Incentive Rates</h3>
                <p className="text-sm text-slate-500 mt-1">Click on a rate to edit</p>
              </div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Rate</th>
                    <th>Formula</th>
                    <th>Applicable Positions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config: IncentiveConfig) => (
                    <tr key={config.type}>
                      <td>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">{config.type}</code>
                      </td>
                      <td className="font-medium text-slate-900">{config.name}</td>
                      <td>
                        {editingType === config.type ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step={config.formulaType === 'PERCENT' ? '0.01' : '1'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="input w-24 text-sm"
                              autoFocus
                            />
                            {config.formulaType === 'PERCENT' && (
                              <span className="text-slate-500 text-sm">(decimal, e.g., 0.10 = 10%)</span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(config)}
                            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            {formatRate(config)}
                          </button>
                        )}
                      </td>
                      <td>
                        <span className="text-sm text-slate-600">{getFormulaDisplay(config)}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {config.positions?.map((pos) => (
                            <span
                              key={pos}
                              className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                            >
                              {POSITION_LABELS[pos as keyof typeof POSITION_LABELS] || pos}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {editingType === config.type ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(config.type)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Save"
                              disabled={updateConfigMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                              title="Cancel"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Legend */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-4">
            <h4 className="font-medium text-slate-900 mb-3">Formula Types</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">COUNT_MULTIPLY</span>
                <p className="text-slate-600">Input is a count (number of procedures). Calculated as: Count × Rate</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">PERCENT</span>
                <p className="text-slate-600">Input is a peso amount. Calculated as: Amount × Percentage Rate</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h4 className="font-medium text-slate-900 mb-3">Position Categories</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Veterinarians:</span>
                <span className="text-slate-600 ml-2">CBC, Blood Chem, Ultrasound, Test Kits, X-Ray, Surgery, Emergency, Confinement (Vet)</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Groomers:</span>
                <span className="text-slate-600 ml-2">Grooming</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Staff/Assistants:</span>
                <span className="text-slate-600 ml-2">Surgery, Emergency, Confinement (Asst), Nursing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
