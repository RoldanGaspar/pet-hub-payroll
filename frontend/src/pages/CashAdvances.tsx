import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Check, Wallet } from 'lucide-react';
import Header from '../components/layout/Header';
import { cashAdvanceApi, employeeApi } from '../utils/api';
import { CashAdvance, Employee } from '../types';
import { formatCurrency, formatDate, cn } from '../utils/helpers';

export default function CashAdvances() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCA, setEditingCA] = useState<CashAdvance | null>(null);
  const [showPaid, setShowPaid] = useState(false);
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

  const { data: cashAdvances, isLoading } = useQuery({
    queryKey: ['cashAdvances', showPaid],
    queryFn: () =>
      cashAdvanceApi.getAll({ isPaid: showPaid ? undefined : false }).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => cashAdvanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cashAdvanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
      closeModal();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => cashAdvanceApi.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cashAdvanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashAdvances'] });
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

  const handleMarkPaid = (ca: CashAdvance) => {
    if (window.confirm(`Mark ${formatCurrency(ca.amount)} cash advance as paid?`)) {
      markPaidMutation.mutate(ca.id);
    }
  };

  const handleDelete = (ca: CashAdvance) => {
    if (window.confirm(`Delete this cash advance of ${formatCurrency(ca.amount)}?`)) {
      deleteMutation.mutate(ca.id);
    }
  };

  const totalUnpaid = cashAdvances
    ?.filter((ca: CashAdvance) => !ca.isPaid)
    .reduce((sum: number, ca: CashAdvance) => sum + Number(ca.amount), 0) || 0;

  return (
    <>
      <Header title="Cash Advances" subtitle="Track employee cash advances and payments" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Unpaid</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalUnpaid)}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Advances</p>
                <p className="text-2xl font-bold text-slate-900">
                  {cashAdvances?.filter((ca: CashAdvance) => !ca.isPaid).length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6 flex items-center justify-center">
            <button onClick={() => openModal()} className="btn-primary">
              <Plus className="h-4 w-4" />
              New Cash Advance
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Cash Advances</h3>
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
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Amount</th>
                  <th>Date Taken</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : cashAdvances?.length > 0 ? (
                  cashAdvances.map((ca: CashAdvance) => (
                    <tr key={ca.id}>
                      <td className="font-medium text-slate-900">{ca.employee?.name}</td>
                      <td className="text-slate-600">{ca.employee?.branch?.name}</td>
                      <td className="font-medium">{formatCurrency(ca.amount)}</td>
                      <td className="text-slate-600">{formatDate(ca.dateTaken)}</td>
                      <td className="text-slate-500 max-w-xs truncate">{ca.notes || '-'}</td>
                      <td>
                        <span
                          className={cn(
                            'badge',
                            ca.isPaid ? 'badge-success' : 'badge-warning'
                          )}
                        >
                          {ca.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          {!ca.isPaid && (
                            <button
                              onClick={() => handleMarkPaid(ca)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Mark as Paid"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openModal(ca)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ca)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      <Wallet className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No cash advances found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={closeModal}></div>
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                  {editingCA ? 'Edit Cash Advance' : 'New Cash Advance'}
                </h2>

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
                      {employees?.map((emp: Employee) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.branch?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Amount</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Date Taken</label>
                    <input
                      type="date"
                      value={formData.dateTaken}
                      onChange={(e) => setFormData({ ...formData, dateTaken: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input"
                      rows={2}
                      placeholder="Optional notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingCA ? 'Save Changes' : 'Add Cash Advance'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
