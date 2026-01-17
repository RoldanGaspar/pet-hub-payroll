import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(amount: number | string, decimals = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM dd')} - ${format(end, 'dd, yyyy')}`;
  }
  
  return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
}

export function calculateRatePerDay(salary: number): number {
  return Math.round((salary / 26) * 1000000) / 1000000;
}

export function calculateRatePerHour(ratePerDay: number): number {
  return Math.round((ratePerDay / 8) * 1000000) / 1000000;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-700';
    case 'PAID':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function getPositionIncentiveTypes(position: string): string[] {
  if (position.includes('VETERINARIAN')) {
    return ['CBC', 'BLOOD_CHEM', 'ULTRASOUND', 'TEST_KITS', 'SURGERY', 'EMERGENCY', 'XRAY', 'CONFINEMENT'];
  }
  if (position === 'GROOMER' || position === 'GROOMER_VET_ASSISTANT') {
    return ['GROOMING', 'SURGERY', 'EMERGENCY', 'NURSING', 'CONFINEMENT'];
  }
  if (position === 'STAFF') {
    return ['TK_100', 'TK_90', 'MEDS_100', 'MEDS_90'];
  }
  return ['SURGERY', 'EMERGENCY', 'NURSING', 'CONFINEMENT'];
}
