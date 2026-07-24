import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incentiveSheetApi } from '../utils/api';
import {
  IncentiveSheetResponse,
  DistributionPreviewItem,
  SHARED_INCENTIVE_TYPES,
} from '../types';

interface UseIncentiveSheetOptions {
  branchId: number;
  startDate: string;
  endDate: string;
}

export function useIncentiveSheet({ branchId, startDate, endDate }: UseIncentiveSheetOptions) {
  const queryClient = useQueryClient();
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<DistributionPreviewItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch sheet data
  const { data, isLoading, isError } = useQuery<IncentiveSheetResponse>({
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

  // Compute preview locally for instant feedback
  const computeLocalPreview = useCallback(
    (currentGrid: Record<string, Record<string, number>>) => {
      if (!data?.employees) return;
      const localTotals: Record<string, number> = {};
      for (const type of SHARED_INCENTIVE_TYPES) {
        localTotals[type] = Object.values(currentGrid[type] || {}).reduce(
          (sum, val) => sum + (val || 0),
          0
        );
      }
      // Build a simple preview from the server's employee list
      // The server returns the full preview; we just show totals locally
      // and let the server compute the real preview on save
      return localTotals;
    },
    [data?.employees]
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
        computeLocalPreview(updated);
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
    [recalcTotals, computeLocalPreview]
  );

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!data?.sheet?.id) return;

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

  // Manual save mutation
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

  // Distribute mutation
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
    },
  });

  const handleSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  const handleDistribute = useCallback(async () => {
    await distributeMutation.mutateAsync();
  }, [distributeMutation]);

  // Grand total
  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

  return {
    // State
    grid,
    totals,
    preview,
    hasChanges,
    isSaving: saveMutation.isPending,
    isDistributing: distributeMutation.isPending,
    isLoading,
    isError,
    grandTotal,
    days: data?.days || [],
    sheet: data?.sheet,
    employees: data?.employees || [],

    // Actions
    handleCellChange,
    handleSave,
    handleDistribute,
    setGrid,
    setTotals,
    setPreview,
  };
}
