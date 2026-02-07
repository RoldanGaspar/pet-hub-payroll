import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Users, Search, Info, Receipt, Ban } from 'lucide-react';
import Header from '../components/layout/Header';
import { employeeApi, branchApi } from '../utils/api';
import { Employee, Branch, POSITION_LABELS, PositionType } from '../types';
import { formatCurrency, cn } from '../utils/helpers';
import FixedDeductionsModal from '../components/FixedDeductionsModal';
import IncentiveExclusionsModal from '../components/IncentiveExclusionsModal';

// Constants for rate calculation
const ANNUAL_WORKING_DAYS = 313;
const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
const DEFAULT_WORKING_HOURS_PER_DAY = 8;

// Check if position uses annual formula
function usesAnnualFormula(position: PositionType): boolean {
  return position !== 'RESIDENT_VETERINARIAN';
}

// Calculate rates based on position
function calculateRates(
  salary: number,
  position: PositionType,
  branchDaysPerMonth: number = DEFAULT_WORKING_DAYS_PER_MONTH,
  branchHoursPerDay: number = DEFAULT_WORKING_HOURS_PER_DAY
): { ratePerDay: number; ratePerHour: number } {
  if (usesAnnualFormula(position)) {
    // Annual formula: (Salary × 12) ÷ 313
    const annualSalary = salary * 12;
    const ratePerDay = Math.round((annualSalary / ANNUAL_WORKING_DAYS) * 100) / 100;
    const ratePerHour = Math.round((ratePerDay / 8) * 100) / 100;
    return { ratePerDay, ratePerHour };
  } else {
    // Monthly formula: Salary ÷ D (branch days)
    const ratePerDay = Math.round((salary / branchDaysPerMonth) * 100) / 100;
    const ratePerHour = Math.round((ratePerDay / branchHoursPerDay) * 100) / 100;
    return { ratePerDay, ratePerHour };
  }
}

// Get formula description
function getFormulaDescription(position: PositionType): string {
  if (usesAnnualFormula(position)) {
    return 'Annual: (Salary × 12) ÷ 313';
  }
  return 'Monthly: Salary ÷ D (branch days)';
}

export default function Employees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recalculateRates, setRecalculateRates] = useState(true);
  const [deductionsEmployee, setDeductionsEmployee] = useState<Employee | null>(null);
  const [exclusionsEmployee, setExclusionsEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    position: 'VETERINARY_ASSISTANT' as PositionType,
    salary: '',
    ratePerDay: '',
    ratePerHour: '',
    address: '',
    sssNo: '',
    tinNo: '',
    philhealthNo: '',
    pagibigNo: '',
    hiredOn: '',
  });

  const queryClient = useQueryClient();

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll().then((res) => res.data),
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', selectedBranch],
    queryFn: () =>
      employeeApi.getAll(selectedBranch ? parseInt(selectedBranch) : undefined).then((res) => res.data),
  });

  // Get selected branch settings
  const selectedBranchData = useMemo(() => {
    if (!formData.branchId || !branches) return null;
    return branches.find((b: Branch) => b.id === parseInt(formData.branchId));
  }, [formData.branchId, branches]);

  // Calculate rates when salary or position changes (for new employees or when recalculate is checked)
  useEffect(() => {
    const salaryValue = parseFloat(formData.salary) || 0;
    if (salaryValue > 0 && (!editingEmployee || recalculateRates)) {
      const branchDays = selectedBranchData?.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH;
      const branchHours = selectedBranchData?.workingHoursPerDay ?? DEFAULT_WORKING_HOURS_PER_DAY;
      const rates = calculateRates(salaryValue, formData.position, branchDays, branchHours);
      setFormData(prev => ({
        ...prev,
        ratePerDay: rates.ratePerDay.toString(),
        ratePerHour: rates.ratePerHour.toString(),
      }));
    }
  }, [formData.salary, formData.position, formData.branchId, selectedBranchData, editingEmployee, recalculateRates]);

  const createMutation = useMutation({
    mutationFn: (data: any) => employeeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => employeeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const openModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setRecalculateRates(false); // Default to keeping current rates when editing
      setFormData({
        branchId: employee.branchId.toString(),
        name: employee.name,
        position: employee.position,
        salary: employee.salary.toString(),
        ratePerDay: employee.ratePerDay.toString(),
        ratePerHour: employee.ratePerHour.toString(),
        address: employee.address || '',
        sssNo: employee.sssNo || '',
        tinNo: employee.tinNo || '',
        philhealthNo: employee.philhealthNo || '',
        pagibigNo: employee.pagibigNo || '',
        hiredOn: employee.hiredOn ? employee.hiredOn.split('T')[0] : '',
      });
    } else {
      setEditingEmployee(null);
      setRecalculateRates(true);
      setFormData({
        branchId: selectedBranch || (branches?.[0]?.id?.toString() || ''),
        name: '',
        position: 'VETERINARY_ASSISTANT',
        salary: '',
        ratePerDay: '',
        ratePerHour: '',
        address: '',
        sssNo: '',
        tinNo: '',
        philhealthNo: '',
        pagibigNo: '',
        hiredOn: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setRecalculateRates(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      ...formData,
      ratePerDay: parseFloat(formData.ratePerDay),
      ratePerHour: parseFloat(formData.ratePerHour),
    };

    if (editingEmployee) {
      submitData.recalculateRates = recalculateRates;
      updateMutation.mutate({ id: editingEmployee.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const filteredEmployees = employees?.filter((emp: Employee) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formulaDescription = getFormulaDescription(formData.position);

  return (
    <>
      <Header title="Employees" subtitle="Manage employee records and information" />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees..."
                className="input pl-10"
              />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Branches</option>
              {branches?.map((branch: Branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => openModal()} className="btn-primary whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>

        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Position</th>
                  <th>Salary</th>
                  <th>Rate/Day</th>
                  <th>Rate/Hour</th>
                  <th>Deductions</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees?.length > 0 ? (
                  filteredEmployees.map((employee: Employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{employee.name}</p>
                            <p className="text-xs text-slate-500">{employee.sssNo || 'No SSS'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-600">{employee.branch?.name}</td>
                      <td>
                        <span className="text-sm">{POSITION_LABELS[employee.position]}</span>
                      </td>
                      <td className="font-medium">{formatCurrency(employee.salary)}</td>
                      <td className="text-primary-600 font-medium">{formatCurrency(employee.ratePerDay)}</td>
                      <td className="text-slate-600">{formatCurrency(employee.ratePerHour)}</td>
                      <td>
                        <button
                          onClick={() => setDeductionsEmployee(employee)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                        >
                          {employee.fixedDeductions && employee.fixedDeductions.length > 0
                            ? formatCurrency(
                                employee.fixedDeductions.reduce(
                                  (sum, d) => sum + Number(d.amount),
                                  0
                                )
                              )
                            : '₱0.00'}
                        </button>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'badge',
                            employee.isActive ? 'badge-success' : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setDeductionsEmployee(employee)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Fixed Deductions"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setExclusionsEmployee(employee)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            title="Incentive Exclusions (NOT INCLUDED)"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(employee)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                            title="Edit Employee"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No employees found
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
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="label">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input"
                        placeholder="Juan Dela Cruz"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Branch</label>
                      <select
                        value={formData.branchId}
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        className="input"
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches?.map((branch: Branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Position</label>
                      <select
                        value={formData.position}
                        onChange={(e) =>
                          setFormData({ ...formData, position: e.target.value as PositionType })
                        }
                        className="input"
                        required
                      >
                        {Object.entries(POSITION_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Monthly Salary</label>
                      <input
                        type="number"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        className="input"
                        placeholder="15000"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Date Hired</label>
                      <input
                        type="date"
                        value={formData.hiredOn}
                        onChange={(e) => setFormData({ ...formData, hiredOn: e.target.value })}
                        className="input"
                      />
                    </div>

                    {/* Rate Calculation Section */}
                    <div className="md:col-span-2 border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900">Rate Calculation</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Info className="h-3 w-3" />
                          <span>{formulaDescription}</span>
                        </div>
                      </div>

                      {/* Recalculate checkbox - only shown when editing */}
                      {editingEmployee && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={recalculateRates}
                              onChange={(e) => setRecalculateRates(e.target.checked)}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-amber-800">
                              Recalculate rates from salary (uncheck to keep custom values)
                            </span>
                          </label>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">Rate/Day</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.ratePerDay}
                            onChange={(e) => {
                              setFormData({ ...formData, ratePerDay: e.target.value });
                              if (editingEmployee) setRecalculateRates(false);
                            }}
                            className="input"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Rate/Hour</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.ratePerHour}
                            onChange={(e) => {
                              setFormData({ ...formData, ratePerHour: e.target.value });
                              if (editingEmployee) setRecalculateRates(false);
                            }}
                            className="input"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      {parseFloat(formData.salary) > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          {usesAnnualFormula(formData.position) ? (
                            <>Formula: ({formatCurrency(parseFloat(formData.salary))} × 12) ÷ 313 = {formatCurrency(parseFloat(formData.ratePerDay))}/day</>
                          ) : (
                            <>Formula: {formatCurrency(parseFloat(formData.salary))} ÷ {selectedBranchData?.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH} = {formatCurrency(parseFloat(formData.ratePerDay))}/day</>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="input"
                        placeholder="Full address"
                      />
                    </div>

                    <div>
                      <label className="label">SSS Number</label>
                      <input
                        type="text"
                        value={formData.sssNo}
                        onChange={(e) => setFormData({ ...formData, sssNo: e.target.value })}
                        className="input"
                        placeholder="XX-XXXXXXX-X"
                      />
                    </div>

                    <div>
                      <label className="label">TIN Number</label>
                      <input
                        type="text"
                        value={formData.tinNo}
                        onChange={(e) => setFormData({ ...formData, tinNo: e.target.value })}
                        className="input"
                        placeholder="XXX-XXX-XXX-XXX"
                      />
                    </div>

                    <div>
                      <label className="label">PhilHealth Number</label>
                      <input
                        type="text"
                        value={formData.philhealthNo}
                        onChange={(e) => setFormData({ ...formData, philhealthNo: e.target.value })}
                        className="input"
                        placeholder="XX-XXXXXXXXX-X"
                      />
                    </div>

                    <div>
                      <label className="label">Pag-IBIG Number</label>
                      <input
                        type="text"
                        value={formData.pagibigNo}
                        onChange={(e) => setFormData({ ...formData, pagibigNo: e.target.value })}
                        className="input"
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={closeModal} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingEmployee ? 'Save Changes' : 'Add Employee'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Deductions Modal */}
        {deductionsEmployee && (
          <FixedDeductionsModal
            employee={deductionsEmployee}
            onClose={() => setDeductionsEmployee(null)}
          />
        )}

        {/* Incentive Exclusions Modal */}
        {exclusionsEmployee && (
          <IncentiveExclusionsModal
            employee={exclusionsEmployee}
            onClose={() => setExclusionsEmployee(null)}
          />
        )}
      </div>
    </>
  );
}
