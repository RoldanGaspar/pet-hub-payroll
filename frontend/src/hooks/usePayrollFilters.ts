import { useMemo } from 'react';
import { PayrollPeriod } from '../types';

export interface PayrollException {
  type: 'negative_net_pay' | 'zero_net_pay' | 'missing_attendance' | 'excessive_ot' | 'deductions_exceed_gross';
  severity: 'critical' | 'warning';
  message: string;
}

export type PayrollFilterTab = 'all' | 'attention' | 'ready';

export function detectExceptions(payroll: PayrollPeriod): PayrollException[] {
  const exceptions: PayrollException[] = [];

  if (payroll.netPay < 0) {
    exceptions.push({ type: 'negative_net_pay', severity: 'critical', message: 'Negative net pay' });
  }
  if (payroll.netPay === 0) {
    exceptions.push({ type: 'zero_net_pay', severity: 'warning', message: 'Zero net pay' });
  }
  if (payroll.totalDaysPresent === 0) {
    exceptions.push({ type: 'missing_attendance', severity: 'warning', message: 'No days present' });
  }
  if (Number(payroll.overtimeHours) > 12) {
    exceptions.push({ type: 'excessive_ot', severity: 'warning', message: `Unusually high OT: ${payroll.overtimeHours}h` });
  }
  if (payroll.totalDeductions > payroll.grossPay) {
    exceptions.push({ type: 'deductions_exceed_gross', severity: 'critical', message: 'Deductions exceed gross pay' });
  }

  return exceptions;
}

export function hasExceptions(payroll: PayrollPeriod): boolean {
  return detectExceptions(payroll).length > 0;
}

export function isReadyForApproval(payroll: PayrollPeriod): boolean {
  return payroll.status === 'DRAFT' && payroll.netPay > 0 && !hasExceptions(payroll);
}

export function usePayrollFilters(payrolls: PayrollPeriod[] | undefined) {
  const filterCounts = useMemo(() => {
    if (!payrolls) return { all: 0, attention: 0, ready: 0 };

    let attention = 0;
    let ready = 0;

    payrolls.forEach((p) => {
      if (hasExceptions(p)) attention++;
      else if (isReadyForApproval(p)) ready++;
    });

    return {
      all: payrolls.length,
      attention,
      ready,
    };
  }, [payrolls]);

  const filterPayrolls = (payrolls: PayrollPeriod[], tab: PayrollFilterTab): PayrollPeriod[] => {
    if (!payrolls) return [];
    
    switch (tab) {
      case 'attention':
        return payrolls.filter(hasExceptions);
      case 'ready':
        return payrolls.filter(isReadyForApproval);
      case 'all':
      default:
        return payrolls;
    }
  };

  return { filterCounts, filterPayrolls, detectExceptions, hasExceptions };
}
