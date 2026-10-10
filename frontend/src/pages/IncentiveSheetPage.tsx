import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { payrollApi } from '../utils/api';
import { PayrollPeriod } from '../types';
import { formatDateRange } from '../utils/helpers';
import { useIncentiveSheet } from '../hooks/useIncentiveSheet';
import IncentiveSheetGrid from '../components/IncentiveSheetGrid';
import DistributionPreviewPanel from '../components/DistributionPreviewPanel';

export default function IncentiveSheetPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  // Fetch the payroll period to get branch info and dates
  const { data: payroll, isLoading: payrollLoading } = useQuery<PayrollPeriod>({
    queryKey: ['payroll', Number(periodId)],
    queryFn: () => payrollApi.getById(Number(periodId)).then((res) => res.data),
    enabled: !!periodId,
  });

  // Get branch info from the first payroll in the period
  const branchId = payroll?.employee?.branchId || 0;
  const branchName = payroll?.employee?.branch?.name || 'Unknown Branch';
  const startDate = payroll?.startDate?.split('T')[0] || '';
  const endDate = payroll?.endDate?.split('T')[0] || '';

  // Use the incentive sheet hook
  const {
    grid,
    totals,
    preview,
    hasChanges,
    isSaving,
    isDistributing,
    isLoading: sheetLoading,
    grandTotal,
    days,
    sheet,
    handleCellChange,
    handleSave,
    handleDistribute,
  } = useIncentiveSheet({
    branchId,
    startDate,
    endDate,
  });

  const isLoading = payrollLoading || sheetLoading;

  const handleDistributeClick = async () => {
    if (!window.confirm('This will distribute the calculated incentive amounts to all eligible employee payrolls. Continue?')) {
      return;
    }
    try {
      await handleDistribute();
      // Navigate back after successful distribution
      navigate('/payroll');
    } catch (error) {
      console.error('Distribution failed:', error);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/payroll');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-lg">Loading incentive sheet...</p>
        </div>
      </div>
    );
  }

  if (!periodId || !startDate || !endDate) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 text-lg">Invalid payroll period</p>
          <Button onClick={() => navigate('/payroll')}>
            Back to Payroll
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Back to Payroll"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">Branch Incentive Sheet</h1>
              <p className="text-indigo-200 text-sm">
                {branchName} • {formatDateRange(startDate, endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Distributed Badge */}
            {sheet?.isDistributed && (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-100 text-xs px-3 py-1.5 rounded-full border border-emerald-400/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Distributed
              </span>
            )}

            {/* Unsaved changes badge */}
            {hasChanges && (
              <span className="bg-amber-500/20 text-amber-100 text-xs px-3 py-1.5 rounded-full border border-amber-400/30">
                Unsaved changes
              </span>
            )}

            {/* Type Totals Summary */}
            <div className="hidden md:flex items-center gap-2">
              {Object.entries(totals).map(([type, total]) => (
                <div key={type} className="bg-white/10 rounded-lg px-3 py-1.5 text-center min-w-[70px]">
                  <p className="text-[10px] text-indigo-200 uppercase tracking-wider">{type.slice(0, 4)}</p>
                  <p className="font-bold text-sm">{(total || 0).toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="border-b bg-white shrink-0 px-6">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {!showPreview ? (
          /* Full-screen Grid View */
          <div className="h-full flex">
            {/* Grid takes most of the space */}
            <div className="flex-1 overflow-hidden">
              <IncentiveSheetGrid
                days={days}
                grid={grid}
                totals={totals}
                isDistributed={sheet?.isDistributed || false}
                onCellChange={handleCellChange}
              />
            </div>

            {/* Sticky Right Preview Panel */}
            <div className="w-80 border-l border-slate-200 bg-white shrink-0 hidden lg:block">
              <DistributionPreviewPanel
                preview={preview}
                grandTotal={grandTotal}
                isLoading={sheetLoading}
              />
            </div>
          </div>
        ) : (
          /* Full Preview View */
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <DistributionPreviewPanel
                preview={preview}
                grandTotal={grandTotal}
                isLoading={sheetLoading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t bg-white px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{days.length} days</span> in this period
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges || sheet?.isDistributed}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDistributeClick}
              disabled={isDistributing || grandTotal === 0 || sheet?.isDistributed}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isDistributing ? 'Distributing...' : sheet?.isDistributed ? 'Already Distributed' : 'Save & Distribute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
