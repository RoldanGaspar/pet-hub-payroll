import React from 'react';
import { AlertTriangle, CheckCircle, List } from 'lucide-react';
import { PayrollFilterTab } from '../hooks/usePayrollFilters';

interface FilterCounts {
  all: number;
  attention: number;
  ready: number;
}

interface PayrollFilterBarProps {
  activeTab: PayrollFilterTab;
  onTabChange: (tab: PayrollFilterTab) => void;
  counts: FilterCounts;
}

const tabs: { key: PayrollFilterTab; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  {
    key: 'all',
    label: 'All',
    icon: <List className="h-4 w-4" />,
    color: 'text-slate-500 bg-slate-100',
    activeColor: 'text-primary-700 bg-primary-100 border-primary-300',
  },
  {
    key: 'attention',
    label: 'Attention Needed',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-50',
    activeColor: 'text-amber-800 bg-amber-100 border-amber-300',
  },
  {
    key: 'ready',
    label: 'Ready for Approval',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-emerald-600 bg-emerald-50',
    activeColor: 'text-emerald-800 bg-emerald-100 border-emerald-300',
  },
];

export default function PayrollFilterBar({ activeTab, onTabChange, counts }: PayrollFilterBarProps) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key];
        
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
              ${isActive 
                ? `${tab.activeColor} shadow-sm` 
                : `${tab.color} border-transparent hover:border-slate-200`
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`
              inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold
              ${isActive 
                ? 'bg-white/80 text-inherit' 
                : 'bg-white text-slate-600'
              }
            `}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
