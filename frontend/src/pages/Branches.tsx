import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Building2, MapPin, Phone, Clock, Calendar } from 'lucide-react';
import Header from '../components/layout/Header';
import { branchApi } from '../utils/api';
import { Branch, BRANCH_TYPE_LABELS, BranchType } from '../types';
import { cn } from '../utils/helpers';

// Default values for rate calculation
const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
const DEFAULT_WORKING_HOURS_PER_DAY = 8;

export default function Branches() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact: '',
    type: 'VETERINARY_CLINIC' as BranchType,
    workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH,
    workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY,
  });

  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => branchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      branchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const openModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address,
        contact: branch.contact || '',
        type: branch.type,
        workingDaysPerMonth: branch.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH,
        workingHoursPerDay: branch.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        address: '',
        contact: '',
        type: 'VETERINARY_CLINIC',
        workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH,
        workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      contact: '',
      type: 'VETERINARY_CLINIC',
      workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH,
      workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (branch: Branch) => {
    if (window.confirm(`Are you sure you want to delete ${branch.name}?`)) {
      deleteMutation.mutate(branch.id);
    }
  };

  return (
    <>
      <Header title="Branches" subtitle="Manage Pet Hub branch locations" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-500">
            {branches?.length || 0} branches
          </div>
          <button onClick={() => openModal()} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Branch
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches?.map((branch: Branch) => (
              <div key={branch.id} className="card overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                        <span className="text-xs text-slate-500">
                          {BRANCH_TYPE_LABELS[branch.type]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(branch)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(branch)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 mt-0.5 text-slate-400" />
                      <span>{branch.address || 'No address'}</span>
                    </div>
                    {branch.contact && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{branch.contact}</span>
                      </div>
                    )}
                  </div>

                  {/* Rate Calculation Settings */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">{branch.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH}</span> days/month
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">{branch.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY}</span> hrs/day
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {branch._count?.employees || 0} employees
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        branch.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={closeModal}></div>
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Branch Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Pet Hub Manila"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input"
                      rows={2}
                      placeholder="Full address"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Contact Number</label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="input"
                      placeholder="0917-xxx-xxxx"
                    />
                  </div>

                  <div>
                    <label className="label">Branch Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as BranchType })}
                      className="input"
                    >
                      {Object.entries(BRANCH_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rate Calculation Settings */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Rate Calculation Settings</h4>
                    <p className="text-xs text-slate-500 mb-3">
                      These values are used to calculate employee rate per day and rate per hour from their monthly salary.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Working Days/Month (D)</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.workingDaysPerMonth}
                          onChange={(e) => setFormData({ ...formData, workingDaysPerMonth: parseInt(e.target.value) || DEFAULT_WORKING_DAYS_PER_MONTH })}
                          className="input"
                        />
                        <p className="text-xs text-slate-400 mt-1">Rate/Day = Salary ÷ D</p>
                      </div>
                      <div>
                        <label className="label">Working Hours/Day (H)</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={formData.workingHoursPerDay}
                          onChange={(e) => setFormData({ ...formData, workingHoursPerDay: parseInt(e.target.value) || DEFAULT_WORKING_HOURS_PER_DAY })}
                          className="input"
                        />
                        <p className="text-xs text-slate-400 mt-1">Rate/Hour = Rate/Day ÷ H</p>
                      </div>
                    </div>
                    {editingBranch && (
                      <p className="text-xs text-amber-600 mt-2">
                        Note: Changing these values will recalculate rates for all employees in this branch.
                      </p>
                    )}
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
                      {editingBranch ? 'Save Changes' : 'Add Branch'}
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
