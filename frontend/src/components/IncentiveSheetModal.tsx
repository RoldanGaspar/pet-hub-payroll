import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { incentiveSheetApi } from '../utils/api';
import {
  IncentiveSheetResponse,
  DistributionPreviewItem,
  SHARED_INCENTIVE_LABELS,
  SHARED_INCENTIVE_TYPES,
} from '../types';
import { formatCurrency } from '../utils/helpers';

interface IncentiveSheetModalProps {
  branchId: number;
  branchName: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

export default function IncentiveSheetModal({
  branchId,
  branchName,
  startDate,
  endDate,
  onClose,
}: IncentiveSheetModalProps) {
  const queryClient = useQueryClient();
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<DistributionPreviewItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch sheet data
  const { data, isLoading } = useQuery<IncentiveSheetResponse>({
    queryKey: ['incentive-sheet', branchId, startDate, endDate],
    queryFn: () => incentiveSheetApi.getSheet(branchId, startDate, endDate).then((res) => res.data),
  });

  // Initialize grid from server data
  useEffect(() => {
    if (data) {
      setGrid(data.grid);
      setTotals(data.totals);
      setPreview(data.distributionPreview);
    }
  }, [data]);

  // Calculate totals from grid
  const recalcTotals = useCallback(
    (currentGrid: Record<string, Record<string, number>>) => {
      const newTotals: Record<string, number> = {};
      for (const type of SHARED_INCENTIVE_TYPES) {
        newTotals[type] = Object.values(currentGrid[type] || {}).reduce(
          (sum, val) => sum + (val || 0),
          0
        );
      }
      setTotals(newTotals);
    },
    []
  );

  // Handle cell value change
  const handleCellChange = useCallback(
    (type: string, date: string, value: string) => {
      const numVal = parseFloat(value) || 0;
      setGrid((prev) => {
        const updated = {
          ...prev,
          [type]: {
            ...prev[type],
            [date]: numVal,
          },
        };
        recalcTotals(updated);
        return updated;
      });
      setHasChanges(true);

      // Auto-save after debounce
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 1500);
    },
    [recalcTotals]
  );

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!data?.sheet?.id) return;

    // Collect all non-zero inputs
    const inputs: { date: string; type: string; value: number }[] = [];
    for (const type of SHARED_INCENTIVE_TYPES) {
      for (const [date, value] of Object.entries(grid[type] || {})) {
        inputs.push({ date, type, value: value || 0 });
      }
    }

    try {
      const result = await incentiveSheetApi.saveInputs(data.sheet.id, inputs);
      setPreview(result.data.distributionPreview);
      setHasChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [data?.sheet?.id, grid]);

  // Manual save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!data?.sheet?.id) throw new Error('No sheet');
      const inputs: { date: string; type: string; value: number }[] = [];
      for (const type of SHARED_INCENTIVE_TYPES) {
        for (const [date, value] of Object.entries(grid[type] || {})) {
          inputs.push({ date, type, value: value || 0 });
        }
      }
      return incentiveSheetApi.saveInputs(data.sheet.id, inputs);
    },
    onSuccess: (result) => {
      setPreview(result.data.distributionPreview);
      setHasChanges(false);
    },
  });

  // Distribute incentives
  const distributeMutation = useMutation({
    mutationFn: async () => {
      if (!data?.sheet?.id) throw new Error('No sheet');
      // Save first
      const inputs: { date: string; type: string; value: number }[] = [];
      for (const type of SHARED_INCENTIVE_TYPES) {
        for (const [date, value] of Object.entries(grid[type] || {})) {
          inputs.push({ date, type, value: value || 0 });
        }
      }
      await incentiveSheetApi.saveInputs(data.sheet.id, inputs);
      // Then distribute
      return incentiveSheetApi.distribute(data.sheet.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-sheet'] });
      setHasChanges(false);
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

  const handleDistribute = async () => {
    if (!window.confirm('This will distribute the calculated incentive amounts to all eligible employee payrolls. Continue?')) {
      return;
    }
    setIsDistributing(true);
    try {
      await distributeMutation.mutateAsync();
    } finally {
      setIsDistributing(false);
    }
  };

  // Parse days for display
  const days = data?.days || [];

  // Format a date string as "Dec 11"
  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format just the day number
  const formatDayNum = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').getDate();
  };

  // Scroll the grid left/right
  const scrollGrid = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
    }
  };

  // Grand total (sum of all type totals)
  const grandTotal = useMemo(() => {
    return Object.values(totals).reduce((sum, val) => sum + val, 0);
  }, [totals]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl p-8">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 mt-4">Loading incentive sheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex h-full">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative ml-auto bg-white shadow-xl w-full max-w-6xl h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Branch Incentive Sheet</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {branchName} • {formatDay(startDate)} – {formatDay(endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {data?.sheet?.isDistributed && (
                  <span className="bg-emerald-500/20 text-emerald-100 text-xs px-3 py-1 rounded-full border border-emerald-400/30">
                    ✓ Distributed
                  </span>
                )}
                {hasChanges && (
                  <span className="bg-amber-500/20 text-amber-100 text-xs px-3 py-1 rounded-full border border-amber-400/30">
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Type Totals Summary */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {SHARED_INCENTIVE_TYPES.map((type) => (
                <div key={type} className="bg-white/10 rounded-lg p-3">
                  <p className="text-indigo-200 text-xs">{SHARED_INCENTIVE_LABELS[type]}</p>
                  <p className="font-bold text-lg">{(totals[type] || 0).toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Toggle */}
          <div className="border-b bg-slate-50 px-5 shrink-0">
            <div className="flex">
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  !showPreview
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setShowPreview(false)}
              >
                Daily Input Grid
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  showPreview
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setShowPreview(true)}
              >
                Distribution Preview
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!showPreview ? (
              /* DAILY INPUT GRID */
              <div className="h-full flex flex-col">
                {/* Scroll controls */}
                <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-b shrink-0">
                  <p className="text-xs text-slate-500">
                    Enter daily values for each incentive type. Totals are calculated automatically.
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => scrollGrid('left')}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => scrollGrid('right')}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Grid table */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full flex">
                    {/* Fixed left column (type labels) */}
                    <div className="shrink-0 border-r bg-white z-10">
                      {/* Header cell */}
                      <div className="h-16 border-b bg-slate-100 flex items-end px-3 pb-2">
                        <span className="text-xs font-semibold text-slate-600 uppercase">Type</span>
                      </div>
                      {/* Type rows */}
                      {SHARED_INCENTIVE_TYPES.map((type) => (
                        <div
                          key={type}
                          className="h-12 border-b flex items-center px-3 bg-white"
                        >
                          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                            {SHARED_INCENTIVE_LABELS[type]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Scrollable day columns */}
                    <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
                      <div className="inline-flex min-w-full">
                        {days.map((day) => (
                          <div key={day} className="shrink-0 w-16 border-r">
                            {/* Day header */}
                            <div className="h-16 border-b bg-slate-100 flex flex-col items-center justify-end pb-1.5">
                              <span className="text-[10px] text-slate-400 leading-none">
                                {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                              <span className="text-sm font-bold text-slate-700 leading-tight">
                                {formatDayNum(day)}
                              </span>
                            </div>
                            {/* Input cells */}
                            {SHARED_INCENTIVE_TYPES.map((type) => (
                              <div key={`${type}-${day}`} className="h-12 border-b flex items-center justify-center px-0.5">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={grid[type]?.[day] || ''}
                                  onChange={(e) => handleCellChange(type, day, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full h-8 text-center text-sm border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="–"
                                />
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* Totals column */}
                        <div className="shrink-0 w-20 bg-indigo-50 border-l-2 border-indigo-300">
                          <div className="h-16 border-b bg-indigo-100 flex items-end justify-center pb-2">
                            <span className="text-xs font-bold text-indigo-700 uppercase">Total</span>
                          </div>
                          {SHARED_INCENTIVE_TYPES.map((type) => (
                            <div
                              key={`total-${type}`}
                              className="h-12 border-b flex items-center justify-center"
                            >
                              <span className="text-sm font-bold text-indigo-700">
                                {(totals[type] || 0).toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* DISTRIBUTION PREVIEW */
              <div className="p-5 overflow-y-auto h-full">
                <div className="space-y-4">
                  {preview.map((item) => (
                    <div
                      key={item.configKey}
                      className="bg-white rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">{item.label}</h4>
                        <span className="text-sm text-slate-500">
                          Rate: ₱{item.rate}/unit
                        </span>
                      </div>

                      {/* Formula */}
                      <div className="bg-slate-50 rounded-lg p-3 mb-3 font-mono text-sm">
                        <span className="text-slate-600">
                          ({item.total} × ₱{item.rate}) ÷ {item.numEligible} employees = {' '}
                        </span>
                        <span className="font-bold text-indigo-600">
                          {formatCurrency(item.perPerson)}/person
                        </span>
                      </div>

                      {/* Breakdown */}
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center p-2 bg-slate-50 rounded">
                          <p className="text-slate-500">Total Input</p>
                          <p className="font-bold text-slate-900">{item.total}</p>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded">
                          <p className="text-slate-500">Total Pay</p>
                          <p className="font-bold text-slate-900">{formatCurrency(item.totalPay)}</p>
                        </div>
                        <div className="text-center p-2 bg-emerald-50 rounded">
                          <p className="text-emerald-600">Per Person</p>
                          <p className="font-bold text-emerald-700">{formatCurrency(item.perPerson)}</p>
                        </div>
                      </div>

                      {/* Eligible employees */}
                      {item.numEligible > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-slate-500 mb-1">
                            Distributed to ({item.numEligible} employees):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.eligibleNames.map((name) => (
                              <span
                                key={name}
                                className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.numEligible === 0 && (
                        <p className="text-sm text-amber-600 mt-2">
                          ⚠ No eligible employees for this incentive type
                        </p>
                      )}
                    </div>
                  ))}

                  {preview.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <p>No distribution data. Enter daily values first.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-slate-50 p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-slate-500">Grand Total: </span>
                <span className="font-bold text-indigo-700 text-lg">
                  {grandTotal.toFixed(1)} units
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleDistribute}
                  disabled={isDistributing || grandTotal === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isDistributing ? 'Distributing...' : 'Save & Distribute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
