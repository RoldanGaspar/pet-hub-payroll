import { PositionType } from '@prisma/client';
import { DISTRIBUTION_CONFIG, SHARED_TYPES, DistConfigItem } from '../incentive-sheet.config';
import { MonetaryRules } from '../../../shared/utils/monetary.utils';

interface EmployeeInfo {
  id: number;
  name: string;
  position: PositionType;
}

interface DistributionResult {
  employeeId: number;
  employeeName: string;
  incentiveType: string;
  total: number;
  rate: number;
  numEligible: number;
  amount: number;
  formula: string;
}

export function calculateDistributions(
  totals: Record<string, number>,
  employees: EmployeeInfo[],
  exclusions: Map<number, Set<string>> = new Map()
): DistributionResult[] {
  const results: DistributionResult[] = [];

  for (const [configKey, config] of Object.entries(DISTRIBUTION_CONFIG)) {
    const sourceType = config.sourceType || configKey;
    const total = totals[sourceType] || 0;
    if (total === 0) continue;

    const receivers = employees.filter((e) => {
      const eligible = config.eligiblePositions.includes(e.position);
      const excluded = exclusions.get(e.id)?.has(config.incentiveType);
      return eligible && !excluded;
    });
    if (receivers.length === 0) continue;

    const divisionPositions = config.divisionPositions || config.eligiblePositions;
    const divisionCount = employees.filter((e) => {
      const eligible = divisionPositions.includes(e.position);
      const excluded = exclusions.get(e.id)?.has(config.incentiveType);
      return eligible && !excluded;
    }).length;

    const totalPay = total * config.rate;
    const perPerson = totalPay / (divisionCount > 0 ? divisionCount : 1);

    for (const emp of receivers) {
      results.push({
        employeeId: emp.id, employeeName: emp.name,
        incentiveType: config.incentiveType, total, rate: config.rate,
        numEligible: divisionCount,
        amount: MonetaryRules.round(perPerson),
        formula: `(${total} × ₱${config.rate}) ÷ ${divisionCount} = ₱${MonetaryRules.round(perPerson).toLocaleString()}`,
      });
    }
  }
  return results;
}

export function calculatePreview(
  totals: Record<string, number>,
  employees: EmployeeInfo[],
  exclusions: Map<number, Set<string>> = new Map()
) {
  const preview: any[] = [];
  for (const [configKey, config] of Object.entries(DISTRIBUTION_CONFIG)) {
    const sourceType = config.sourceType || configKey;
    const total = totals[sourceType] || 0;
    const receivers = employees.filter((e) => {
      const eligible = config.eligiblePositions.includes(e.position);
      const excluded = exclusions.get(e.id)?.has(config.incentiveType);
      return eligible && !excluded;
    });
    const divisionPositions = config.divisionPositions || config.eligiblePositions;
    const divisionCount = employees.filter((e) => {
      const eligible = divisionPositions.includes(e.position);
      const excluded = exclusions.get(e.id)?.has(config.incentiveType);
      return eligible && !excluded;
    }).length;
    const totalPay = total * config.rate;
    const perPerson = divisionCount > 0 ? totalPay / divisionCount : 0;
    preview.push({
      configKey, label: config.label, sourceType, total, rate: config.rate,
      numEligible: divisionCount,
      totalPay: MonetaryRules.round(totalPay),
      perPerson: MonetaryRules.round(perPerson),
      eligibleNames: receivers.map((e) => e.name),
    });
  }
  return preview;
}

export function buildGrid(
  dailyInputs: { date: Date; type: string; value: any }[],
  days: string[]
): Record<string, Record<string, number>> {
  const grid: Record<string, Record<string, number>> = {};
  for (const type of SHARED_TYPES) {
    grid[type] = {};
    for (const day of days) grid[type][day] = 0;
  }
  for (const input of dailyInputs) {
    const dateStr = new Date(input.date).toISOString().split('T')[0];
    if (grid[input.type]) grid[input.type][dateStr] = Number(input.value);
  }
  return grid;
}

export function getDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}
