import { ConflictError, NotFoundError } from '../../shared/errors';

export const isPayrollLocked = (status: string) => status === 'APPROVED' || status === 'PAID';

export function assertPayrollEditable(payroll: { id: number; status: string } | null, payrollId: number | string = 'unknown') {
  if (!payroll) throw new NotFoundError('PayrollPeriod', payrollId);
  if (isPayrollLocked(payroll.status)) {
    throw new ConflictError('This payroll is finalized. An administrator must re-open it before it can be changed.');
  }
}
