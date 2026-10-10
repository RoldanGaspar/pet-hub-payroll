import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Building2, MapPin, Phone, Clock, Calendar, Search, X, LayoutGrid, List } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { branchApi } from '../utils/api';
import { Branch, BRANCH_TYPE_LABELS, BranchType } from '../types';
import { cn } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
const DEFAULT_WORKING_HOURS_PER_DAY = 8;

type ViewMode = 'card' | 'table';

export default function Branches() {
  const { user } = useAuth();

  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

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

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('branchesViewMode') as ViewMode) || 'card';
  });

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  useEffect(() => {
    localStorage.setItem('branchesViewMode', viewMode);
  }, [viewMode]);

  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', search, typeFilter, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      branchApi.getAll({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        sort: sortBy,
        order: sortOrder,
      }).then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => branchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch created successfully');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create branch');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      branchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch updated successfully');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update branch');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete branch');
      setDeleteTarget(null);
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

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('active');
  };

  const hasFilters = search || typeFilter || statusFilter !== 'active';

  return (
    <>
      <Header title="Branches" subtitle="Manage Pet Hub branch locations" />

      <div className="p-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches..."
              className="pl-10"
            />
            {search && (
              <Button variant="ghost" size="icon" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value === 'all' ? '' : (value ?? ''))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(BRANCH_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'active')}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              if (!value) return;
              const [s, o] = value.split('-');
              setSortBy(s);
              setSortOrder(o);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="employeeCount-desc">Most Employees</SelectItem>
                <SelectItem value="employeeCount-asc">Fewest Employees</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="text-sm text-slate-500">
              {branches?.length || 0} branch{(branches?.length || 0) !== 1 ? 'es' : ''}
            </div>

            {/* View Toggle */}
            <div className="flex border border-slate-300 rounded-lg overflow-hidden">
              <Button
                variant="ghost" size="icon"
                onClick={() => setViewMode('card')}
                className={cn('p-2 transition-colors rounded-none', viewMode === 'card' ? 'bg-primary-100 text-primary-600' : 'bg-white text-slate-400 hover:text-slate-600')}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={() => setViewMode('table')}
                className={cn('p-2 transition-colors rounded-none', viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'bg-white text-slate-400 hover:text-slate-600')}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {isAdmin && (
              <Button onClick={() => openModal()}>
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </Card>
          )
        ) : branches && branches.length > 0 ? (
          viewMode === 'table' ? (
            <TableView
              branches={branches}
              isAdmin={isAdmin}
              onEdit={(b) => openModal(b)}
              onDelete={(b) => setDeleteTarget(b)}
              onView={(b) => navigate(`/branches/${b.id}`)}
            />
          ) : (
            <CardView
              branches={branches}
              isAdmin={isAdmin}
              onEdit={(b) => openModal(b)}
              onDelete={(b) => setDeleteTarget(b)}
              onView={(b) => navigate(`/branches/${b.id}`)}
            />
          )
        ) : (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No branches found</h3>
            <p className="text-sm text-slate-500 mb-4">
              {hasFilters ? 'Try adjusting your search or filters.' : 'Get started by adding your first branch.'}
            </p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : isAdmin ? (
              <Button onClick={() => openModal()}>
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            ) : null}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </DialogTitle>
              <DialogDescription>
                {editingBranch ? 'Update branch information' : 'Create a new branch location'}
              </DialogDescription>
            </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Branch Name</label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className=""
                      placeholder="Pet Hub Manila"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={2}
                      placeholder="Full address"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Contact Number</label>
                    <Input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className=""
                      placeholder="0917-xxx-xxxx"
                    />
                  </div>

                  <div>
                    <label className="label">Branch Type</label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: (value as BranchType) ?? 'VETERINARY_CLINIC' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BRANCH_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Rate Calculation Settings</h4>
                    <p className="text-xs text-slate-500 mb-3">
                      These values are used to calculate employee rate per day and rate per hour from their monthly salary.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Working Days/Month (D)</label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.workingDaysPerMonth}
                          onChange={(e) => setFormData({ ...formData, workingDaysPerMonth: parseInt(e.target.value) || DEFAULT_WORKING_DAYS_PER_MONTH })}
                          className=""
                        />
                        <p className="text-xs text-slate-400 mt-1">Rate/Day = Salary / D</p>
                      </div>
                      <div>
                        <label className="label">Working Hours/Day (H)</label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={formData.workingHoursPerDay}
                          onChange={(e) => setFormData({ ...formData, workingHoursPerDay: parseInt(e.target.value) || DEFAULT_WORKING_HOURS_PER_DAY })}
                          className=""
                        />
                        <p className="text-xs text-slate-400 mt-1">Rate/Hour = Rate/Day / H</p>
                      </div>
                    </div>
                    {editingBranch && (
                      <p className="text-xs text-amber-600 mt-2">
                        Note: Changing these values will recalculate rates for all employees in this branch.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingBranch ? 'Save Changes' : 'Add Branch'}
                    </Button>
                  </div>
                </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Branch</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Branch'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function CardView({
  branches,
  isAdmin,
  onEdit,
  onDelete,
  onView,
}: {
  branches: Branch[];
  isAdmin: boolean;
  onEdit: (b: Branch) => void;
  onDelete: (b: Branch) => void;
  onView: (b: Branch) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {branches.map((branch: Branch) => (
        <Card
          key={branch.id}
          className="overflow-hidden group border-l-4 border-l-primary-500 hover:shadow-lg transition-all duration-200"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => onView(branch)}>
                <div className="p-3 bg-primary-100 text-primary-600 rounded-xl shadow-sm">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 truncate hover:text-primary-600 transition-colors">{branch.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {BRANCH_TYPE_LABELS[branch.type]}
                  </Badge>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onEdit(branch)}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit Branch"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onDelete(branch)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Branch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-sm mb-4">
              <div className="flex items-start gap-2.5 text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                <MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-700">{branch.address || 'No address'}</span>
              </div>
              {branch.contact && (
                <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{branch.contact}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    <span className="font-medium">{branch.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH}</span> days/mo
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
                {branch.isActive ? (
                  <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TableView({
  branches,
  isAdmin,
  onEdit,
  onDelete,
  onView,
}: {
  branches: Branch[];
  isAdmin: boolean;
  onEdit: (b: Branch) => void;
  onDelete: (b: Branch) => void;
  onView: (b: Branch) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Work Days</TableHead>
            <TableHead>Work Hours</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead className="w-24">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <button
                    onClick={() => onView(branch)}
                    className="font-medium text-slate-900 hover:text-primary-600 transition-colors text-left"
                  >
                    {branch.name}
                  </button>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {BRANCH_TYPE_LABELS[branch.type]}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-slate-500">{branch.address || '-'}</TableCell>
              <TableCell className="text-center">{branch._count?.employees || 0}</TableCell>
              <TableCell className="text-center">{branch.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH}</TableCell>
              <TableCell className="text-center">{branch.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY}</TableCell>
              <TableCell>
                {branch.isActive ? (
                  <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(branch)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(branch)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
