import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import { employeeApi, incentiveApi } from '../utils/api';
import { Employee, IncentiveConfig, INCENTIVE_LABELS } from '../types';

// Shared incentive types that can be excluded
const SHARED_INCENTIVE_TYPES = ['GROOMING', 'SURGERY', 'EMERGENCY', 'NURSING', 'CONFINEMENT_ASST', 'CONFINEMENT_VET'] as const;

interface IncentiveExclusionsModalProps {
  employee: Employee;
  onClose: () => void;
}

export default function IncentiveExclusionsModal({ employee, onClose }: IncentiveExclusionsModalProps) {
  const [excludedTypes, setExcludedTypes] = useState<Set<string>>(new Set());
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch employee's current exclusions
  const { data: exclusions, isLoading: isLoadingExclusions } = useQuery({
    queryKey: ['incentive-exclusions', employee.id],
    queryFn: () => employeeApi.getIncentiveExclusions(employee.id).then((res) => res.data),
  });

  // Fetch incentive configs for this employee's position to see which types they're eligible for
  const { data: configs } = useQuery({
    queryKey: ['incentive-config', employee.position],
    queryFn: () => incentiveApi.getConfigForPosition(employee.position).then((res) => res.data),
  });

  // Initialize excluded types from API response
  useEffect(() => {
    if (exclusions) {
      const excluded = new Set<string>(exclusions.map((e: any) => e.incentiveType));
      setExcludedTypes(excluded);
    }
  }, [exclusions]);

  // Determine which shared incentive types this employee is eligible for
  useEffect(() => {
    if (configs) {
      const eligibleSharedTypes = SHARED_INCENTIVE_TYPES.filter((type) => {
        return configs.some((config: IncentiveConfig) => config.type === type);
      });
      setAvailableTypes(eligibleSharedTypes);
    }
  }, [configs]);

  const toggleExclusionMutation = useMutation({
    mutationFn: (incentiveType: string) =>
      employeeApi.toggleIncentiveExclusion(employee.id, incentiveType),
    onSuccess: (data, incentiveType) => {
      // Update local state based on response
      const newExcluded = new Set(excludedTypes);
      if (data.data.excluded) {
        newExcluded.add(incentiveType);
      } else {
        newExcluded.delete(incentiveType);
      }
      setExcludedTypes(newExcluded);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['incentive-exclusions', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['eligible-counts'] });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });

  const handleToggle = (incentiveType: string) => {
    toggleExclusionMutation.mutate(incentiveType);
  };

  if (isLoadingExclusions) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Incentive Exclusions</h2>
                <p className="text-amber-100 text-sm mt-1">{employee.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Mark as "NOT INCLUDED"</p>
                  <p className="text-xs">
                    Employees marked as NOT INCLUDED will be excluded from receiving and being counted in shared incentive distributions.
                  </p>
                </div>
              </div>
            </div>

            {availableTypes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No shared incentive types available for this position.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableTypes.map((type) => {
                  const isExcluded = excludedTypes.has(type);
                  const label = INCENTIVE_LABELS[type] || type;

                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        isExcluded
                          ? 'bg-red-50 border-red-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={() => handleToggle(type)}
                        disabled={toggleExclusionMutation.isPending}
                        className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${isExcluded ? 'text-red-700' : 'text-slate-900'}`}>
                          {label}
                        </p>
                        {isExcluded && (
                          <p className="text-xs text-red-600 mt-1 font-medium">NOT INCLUDED</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-slate-50 p-6 rounded-b-xl">
            <button
              onClick={onClose}
              className="w-full btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
