import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Check, Wallet, Search, X } from 'lucide-react';
import Header from '../components/layout/Header';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cashAdvanceApi, employeeApi, branchApi } from '../utils/api';
import { CashAdvance, Employee, Branch } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function CashAdvances() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCA, setEditingCA] = useState<CashAdvance | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [markPaidTarget, setMarkPaidTarget] = useState<CashAdvance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashAdvance | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    dateTaken: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.getAll().then((res) => res.data),
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll().then((res) => res.data),
  });

  const { data: cashAdvances, isLoading } = useQuery({
    queryKey: ['cashAdvances', showPaid, searchQuery, branchFilter],
    queryFn: () =>
      cashAdvanceApi.getAll({
        isPaid: showPaid ? undefined : false,
        search: searchQuery || undefined,
        branchId: branchFilter ? parseInt(branchFilter) : undefined,
      }).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => cashAdvanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      toast.success('Cash advance recorded successfully');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to record cash advance');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cashAdvanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      toast.success('Cash advance updated successfully');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update cash advance');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => cashAdvanceApi.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      toast.success('Cash advance marked as paid');
      setMarkPaidTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to mark as paid');
      setMarkPaidTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cashAdvanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      toast.success('Cash advance deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete cash advance');
      setDeleteTarget(null);
    },
  });

  const openModal = (ca?: CashAdvance) => {
    if (ca) {
      setEditingCA(ca);
      setFormData({
        employeeId: ca.employeeId.toString(),
        amount: ca.amount.toString(),
        dateTaken: ca.dateTaken.split('T')[0],
        notes: ca.notes || '',
      });
    } else {
      setEditingCA(null);
      setFormData({
        employeeId: '',
        amount: '',
        dateTaken: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCA(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCA) {
      updateMutation.mutate({ id: editingCA.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const totalUnpaid = cashAdvances
    ?.filter((ca: CashAdvance) => !ca.isPaid)
    .reduce((sum: number, ca: CashAdvance) => sum + Number(ca.amount), 0) || 0;

  const unpaidCount = cashAdvances?.filter((ca: CashAdvance) => !ca.isPaid).length || 0;
  const filteredEmployees = searchQuery || branchFilter
    ? employees?.filter((emp: Employee) => {
        const matchSearch = !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchBranch = !branchFilter || emp.branchId === parseInt(branchFilter);
        return matchSearch && matchBranch;
      })
    : employees;

  return (
    <>
      <Header title="Cash Advances" subtitle="Track employee cash advances and payments" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shadow-sm">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Unpaid</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalUnpaid)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl shadow-sm">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Pending Advances</p>
                <p className="text-3xl font-bold text-slate-900">{unpaidCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 flex items-center justify-center bg-gradient-to-br from-primary-50 to-white border-l-4 border-l-primary-500">
            {isAdmin ? (
              <Button onClick={() => openModal()} className="w-full">
                <Plus className="h-4 w-4" />
                New Cash Advance
              </Button>
            ) : (
              <p className="text-sm text-slate-500">View-only access</p>
            )}
          </Card>
        </div>

        <Card>
          <div className="card-header flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-bold text-lg text-slate-900">Cash Advances</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee..."
                  className="py-1.5 pl-9 w-48"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="input py-1.5 w-auto"
              >
                <option value="">All Branches</option>
                {branches?.map((b: Branch) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showPaid}
                  onChange={(e) => setShowPaid(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                Show paid
              </label>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date Taken</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : cashAdvances?.length > 0 ? (
                cashAdvances.map((ca: CashAdvance) => (
                  <TableRow key={ca.id}>
                    <TableCell className="font-medium text-slate-900">{ca.employee?.name}</TableCell>
                    <TableCell className="text-slate-600">{ca.employee?.branch?.name}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(ca.amount)}</TableCell>
                    <TableCell className="text-slate-600">{formatDate(ca.dateTaken)}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">{ca.notes || '-'}</TableCell>
                    <TableCell>
                      {ca.isPaid ? (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>
                      ) : (
                        <Badge variant="secondary">Unpaid</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {!ca.isPaid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMarkPaidTarget(ca)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Mark as Paid"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModal(ca)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(ca)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No cash advances found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Modal */}
        {isAdmin && isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={closeModal}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingCA ? 'Edit Cash Advance' : 'New Cash Advance'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {editingCA ? 'Update cash advance details' : 'Record a new cash advance'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Employee</label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="input"
                      required
                      disabled={!!editingCA}
                    >
                      <option value="">Select Employee</option>
                      {filteredEmployees?.map((emp: Employee) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.branch?.name})
                        </option>
                      ))}
                    </select>
                    {editingCA && (
                      <p className="text-xs text-slate-400 mt-1">Employee cannot be changed when editing</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Amount</label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className=""
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Date Taken</label>
                    <Input
                      type="date"
                      value={formData.dateTaken}
                      onChange={(e) => setFormData({ ...formData, dateTaken: e.target.value })}
                      className=""
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={2}
                      placeholder="Optional notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingCA ? 'Save Changes' : 'Add Cash Advance'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Mark Paid Confirmation */}
        <AlertDialog open={markPaidTarget !== null} onOpenChange={(open) => { if (!open) setMarkPaidTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
              <AlertDialogDescription>
                Mark {formatCurrency(markPaidTarget?.amount || 0)} cash advance for {markPaidTarget?.employee?.name} as paid?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={markPaidMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => markPaidTarget && markPaidMutation.mutate(markPaidTarget.id)}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? 'Processing...' : 'Mark Paid'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Cash Advance</AlertDialogTitle>
              <AlertDialogDescription>
                Delete cash advance of {formatCurrency(deleteTarget?.amount || 0)} for {deleteTarget?.employee?.name}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
