import prisma from '../../shared/database/prisma';

interface PreflightEmployee {
  id: number;
  name: string;
  position: string;
  salary: number;
  ratePerDay: number;
  ratePerHour: number;
  hasSSS: boolean;
  hasPhilHealth: boolean;
  hasPagIBIG: boolean;
  hasWTax: boolean;
  missingDeductions: string[];
}

interface PreflightWarning {
  type: 'missing_deduction' | 'no_rate';
  employeeId: number;
  employeeName: string;
  message: string;
}

interface PreflightResult {
  branchName: string;
  activeEmployeeCount: number;
  employees: PreflightEmployee[];
  warnings: PreflightWarning[];
}

const MANDATORY_DEDUCTIONS = ['SSS', 'PHILHEALTH', 'PAGIBIG', 'WTAX'];

export class PreflightService {
  async getPreflight(branchId: number): Promise<PreflightResult> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error(`Branch with id ${branchId} not found`);
    }

    const employees = await prisma.employee.findMany({
      where: { branchId, isActive: true },
      include: {
        fixedDeductions: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const warnings: PreflightWarning[] = [];
    const employeeResults: PreflightEmployee[] = employees.map((emp) => {
      const activeDeductionTypes = new Set(
        emp.fixedDeductions.map((fd) => fd.type)
      );

      const missingDeductions = MANDATORY_DEDUCTIONS.filter(
        (d) => !activeDeductionTypes.has(d)
      );

      if (missingDeductions.length > 0) {
        warnings.push({
          type: 'missing_deduction',
          employeeId: emp.id,
          employeeName: emp.name,
          message: `${emp.name} (${emp.position}) is missing ${missingDeductions.join(', ')} fixed deductions`,
        });
      }

      if (Number(emp.ratePerDay) <= 0 || Number(emp.ratePerHour) <= 0) {
        warnings.push({
          type: 'no_rate',
          employeeId: emp.id,
          employeeName: emp.name,
          message: `${emp.name} has zero rate (Rate/Day: ${emp.ratePerDay}, Rate/Hour: ${emp.ratePerHour})`,
        });
      }

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position,
        salary: Number(emp.salary),
        ratePerDay: Number(emp.ratePerDay),
        ratePerHour: Number(emp.ratePerHour),
        hasSSS: activeDeductionTypes.has('SSS'),
        hasPhilHealth: activeDeductionTypes.has('PHILHEALTH'),
        hasPagIBIG: activeDeductionTypes.has('PAGIBIG'),
        hasWTax: activeDeductionTypes.has('WTAX'),
        missingDeductions,
      };
    });

    return {
      branchName: branch.name,
      activeEmployeeCount: employees.length,
      employees: employeeResults,
      warnings,
    };
  }
}
