import { Plus } from 'lucide-react';
import { Branch } from '../../types';

interface PeriodHeaderProps {
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  onCreatePeriod: () => void;
}

export default function PeriodHeader({ branches, selectedBranch, onBranchChange, onCreatePeriod }: PeriodHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <select
        value={selectedBranch}
        onChange={(event) => onBranchChange(event.target.value)}
        className="input w-auto"
        aria-label="Filter payroll by branch"
      >
        <option value="">All Branches</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <button onClick={onCreatePeriod} className="btn-primary">
        <Plus className="h-4 w-4" />
        Create Payroll Period
      </button>
    </div>
  );
}
