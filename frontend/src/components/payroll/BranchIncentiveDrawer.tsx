import { Table2 } from 'lucide-react';

interface BranchIncentiveDrawerProps {
  onOpen: () => void;
}

// The shared-incentive grid lives on its own route so it can accommodate an entire
// payroll period. Keeping its launch control here keeps Payroll.tsx focused on orchestration.
export default function BranchIncentiveDrawer({ onOpen }: BranchIncentiveDrawerProps) {
  return <button onClick={onOpen} className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"><Table2 className="h-4 w-4" />Branch Incentive Sheet</button>;
}
