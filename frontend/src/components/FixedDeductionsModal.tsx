import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { employeeApi } from '../utils/api';
import { Employee, FixedDeduction, DEDUCTION_CATEGORIES, DeductionCategory } from '../types';
import { formatCurrency, cn } from '../utils/helpers';

// Hardcoded deduction types (no longer fetching from config)
const DEDUCTION_TYPES = [
  // Government Benefits
  { type: 'WTAX', name: 'W/Tax', category: 'GOVERNMENT' as DeductionCategory },
  { type: 'SSS', name: 'SSS', category: 'GOVERNMENT' as DeductionCategory },
  { type: 'PAGIBIG', name: 'Pag-IBIG', category: 'GOVERNMENT' as DeductionCategory },
  { type: 'PHILHEALTH', name: 'PhilHealth', category: 'GOVERNMENT' as DeductionCategory },
  // Insurance
  { type: 'SUNLIFE', name: 'Sunlife', category: 'INSURANCE' as DeductionCategory },
  { type: 'BPI_AIA', name: 'BPI AIA', category: 'INSURANCE' as DeductionCategory },
  // Loans
  { type: 'SSS_LOAN', name: 'SSS Loan', category: 'LOANS' as DeductionCategory },
  { type: 'PAGIBIG_LOAN', name: 'Pag-IBIG Loan', category: 'LOANS' as DeductionCategory },
  { type: 'COMPANY_LOAN', name: 'Company Loan', category: 'LOANS' as DeductionCategory },
  // Others
  { type: 'UNIFORM', name: 'Uniform', category: 'OTHERS' as DeductionCategory },
  { type: 'CASH_ADVANCE', name: 'Cash Advance', category: 'OTHERS' as DeductionCategory },
  { type: 'LATE', name: 'Late', category: 'OTHERS' as DeductionCategory },
  { type: 'OTHERS', name: 'Others', category: 'OTHERS' as DeductionCategory },
];

interface FixedDeductionsModalProps {
  employee: Employee;
  onClose: () => void;
}

interface DeductionEntry {
  type: string;
  name: string;
  category: DeductionCategory;
  amount: string;
  isActive: boolean;
}

export default function FixedDeductionsModal({ employee, onClose }: FixedDeductionsModalProps) {
  const [deductions, setDeductions] = useState<DeductionEntry[]>([]);
  const [showAddType, setShowAddType] = useState(false);
  const queryClient = useQueryClient();

  // Fetch employee's current fixed deductions
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['employee', employee.id],
    queryFn: () => employeeApi.getById(employee.id).then((res) => res.data),
  });

  // Initialize deductions from employee data
  useEffect(() => {
    if (employeeData?.fixedDeductions) {
      // Create entries for existing deductions
      const existingDeductions = (employeeData.fixedDeductions as FixedDeduction[]).map((fd) => {
        const typeInfo = DEDUCTION_TYPES.find((t) => t.type === fd.type);
        return {
          type: fd.type,
          name: typeInfo?.name || fd.type,
          category: (fd.category || typeInfo?.category || 'OTHERS') as DeductionCategory,
          amount: String(fd.amount),
          isActive: fd.isActive,
        };
      });

      setDeductions(existingDeductions);
    }
  }, [employeeData]);

  const updateMutation = useMutation({
    mutationFn: (data: { type: string; amount: number; category: string }[]) =>
      employeeApi.updateFixedDeductions(employee.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      onClose();
    },
  });

  const handleAmountChange = (type: string, value: string) => {
    setDeductions((prev) =>
      prev.map((d) => (d.type === type ? { ...d, amount: value } : d))
    );
  };

  const handleAddDeduction = (typeInfo: typeof DEDUCTION_TYPES[0]) => {
    // Check if already exists
    if (deductions.find((d) => d.type === typeInfo.type)) {
      return;
    }

    setDeductions((prev) => [
      ...prev,
      {
        type: typeInfo.type,
        name: typeInfo.name,
        category: typeInfo.category,
        amount: '0',
        isActive: true,
      },
    ]);
    setShowAddType(false);
  };

  const handleRemoveDeduction = (type: string) => {
    setDeductions((prev) => prev.filter((d) => d.type !== type));
  };

  const handleSave = () => {
    const data = deductions
      .filter((d) => parseFloat(d.amount) > 0)
      .map((d) => ({
        type: d.type,
        amount: parseFloat(d.amount) || 0,
        category: d.category,
      }));
    updateMutation.mutate(data);
  };

  // Get unused deduction types
  const unusedTypes = DEDUCTION_TYPES.filter(
    (typeInfo) => !deductions.find((d) => d.type === typeInfo.type)
  );

  // Group deductions by category
  const groupedDeductions = deductions.reduce((acc, d) => {
    const cat = d.category || 'OTHERS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {} as Record<DeductionCategory, DeductionEntry[]>);

  // Calculate total
  const totalDeductions = deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const getCategoryColor = (category: DeductionCategory) => {
    switch (category) {
      case 'GOVERNMENT':
        return 'bg-blue-50 border-blue-200';
      case 'INSURANCE':
        return 'bg-purple-50 border-purple-200';
      case 'LOANS':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  // Select all on focus for easy editing
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Fixed Deductions</h2>
                <p className="text-sm text-slate-600 mt-1">{employee.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Deductions by Category */}
                {(['GOVERNMENT', 'INSURANCE', 'LOANS', 'OTHERS'] as DeductionCategory[]).map((category) => {
                  const categoryDeductions = groupedDeductions[category];
                  if (!categoryDeductions || categoryDeductions.length === 0) return null;

                  return (
                    <div key={category} className={cn('rounded-lg border p-4', getCategoryColor(category))}>
                      <h3 className="font-medium text-slate-900 mb-3">
                        {DEDUCTION_CATEGORIES[category]}
                      </h3>
                      <div className="space-y-3">
                        {categoryDeductions.map((d) => (
                          <div key={d.type} className="flex items-center gap-3 bg-white rounded-lg p-3 border">
                            <div className="flex-1">
                              <label className="text-sm font-medium text-slate-700">{d.name}</label>
                              <code className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                {d.type}
                              </code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={d.amount === '0' ? '' : d.amount}
                                onChange={(e) => handleAmountChange(d.type, e.target.value)}
                                onFocus={handleFocus}
                                className="input w-28 text-right"
                                placeholder="0.00"
                              />
                              <button
                                onClick={() => handleRemoveDeduction(d.type)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {deductions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <p>No fixed deductions set for this employee.</p>
                    <p className="text-sm mt-1">Click "Add Deduction" to add one.</p>
                  </div>
                )}

                {/* Add Deduction Section */}
                {unusedTypes.length > 0 && (
                  <div className="border-t pt-4">
                    {showAddType ? (
                      <div className="bg-slate-50 rounded-lg p-4 border">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">Select Deduction Type</h4>
                          <button
                            onClick={() => setShowAddType(false)}
                            className="text-sm text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {unusedTypes.map((typeInfo) => (
                            <button
                              key={typeInfo.type}
                              onClick={() => handleAddDeduction(typeInfo)}
                              className="text-left p-3 bg-white border rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors"
                            >
                              <p className="font-medium text-slate-900 text-sm">{typeInfo.name}</p>
                              <p className="text-xs text-slate-500">
                                {DEDUCTION_CATEGORIES[typeInfo.category]}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddType(true)}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Add Deduction
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Monthly Deductions</p>
                <p className="text-xl font-semibold text-slate-900">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
