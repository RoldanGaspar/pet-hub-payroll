import 'dotenv/config';
import { PrismaClient, PositionType, Branch } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Default incentive configurations
const DEFAULT_INCENTIVE_CONFIG = [
  {
    type: 'CBC',
    name: 'CBC (Complete Blood Count)',
    rate: 50,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Count × ₱50 per procedure',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    sortOrder: 1,
  },
  {
    type: 'BLOOD_CHEM',
    name: 'Blood Chemistry',
    rate: 100,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Count × ₱100 per procedure',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    sortOrder: 2,
  },
  {
    type: 'ULTRASOUND',
    name: 'Ultrasound',
    rate: 100,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Count × ₱100 per procedure',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    sortOrder: 3,
  },
  {
    type: 'TEST_KITS',
    name: 'Test Kits',
    rate: 50,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Count × ₱50 per test',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    sortOrder: 4,
  },
  {
    type: 'XRAY',
    name: 'X-Ray',
    rate: 100,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Count × ₱100 per X-ray',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    sortOrder: 5,
  },
  {
    type: 'SURGERY',
    name: 'Surgery',
    rate: 0.10,
    formulaType: 'PERCENT',
    description: 'Total Surgery Amount × 10%',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.STAFF,
    ],
    sortOrder: 6,
  },
  {
    type: 'EMERGENCY',
    name: 'Emergency',
    rate: 0.40,
    formulaType: 'PERCENT',
    description: 'Total Emergency Amount × 40%',
    positions: [
      PositionType.RESIDENT_VETERINARIAN,
      PositionType.JUNIOR_VETERINARIAN,
      PositionType.VETERINARY_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.STAFF,
    ],
    sortOrder: 7,
  },
  {
    type: 'CONFINEMENT_VET',
    name: 'Confinement (Vet)',
    rate: 55,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Units × ₱55 per confinement unit',
    positions: [PositionType.RESIDENT_VETERINARIAN, PositionType.JUNIOR_VETERINARIAN],
    sortOrder: 8,
  },
  {
    type: 'CONFINEMENT_ASST',
    name: 'Confinement (Assistant)',
    rate: 45,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Units × ₱45 per confinement unit',
    positions: [
      PositionType.VETERINARY_ASSISTANT,
      PositionType.GROOMER_VET_ASSISTANT,
      PositionType.VETERINARY_NURSE,
      PositionType.STAFF,
    ],
    sortOrder: 9,
  },
  {
    type: 'GROOMING',
    name: 'Grooming',
    rate: 75,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Units × ₱75 per grooming session',
    positions: [PositionType.GROOMER, PositionType.GROOMER_VET_ASSISTANT],
    sortOrder: 10,
  },
  {
    type: 'NURSING',
    name: 'Nursing',
    rate: 80,
    formulaType: 'COUNT_MULTIPLY',
    description: 'Count × ₱80 per nursing case',
    positions: [PositionType.VETERINARY_NURSE, PositionType.VETERINARY_ASSISTANT, PositionType.STAFF],
    sortOrder: 11,
  },
];

async function main() {
  console.log('Seeding database...');

  // Create admin users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pethub.com' },
    update: {},
    create: {
      email: 'admin@pethub.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create test admin account
  const testHashedPassword = await bcrypt.hash('test123', 10);
  
  const testAdmin = await prisma.user.upsert({
    where: { email: 'test@pethub.com' },
    update: {},
    create: {
      email: 'test@pethub.com',
      password: testHashedPassword,
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });
  console.log('Created test admin user:', testAdmin.email);

  // Default rate calculation settings
  const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
  const DEFAULT_WORKING_HOURS_PER_DAY = 8;
  const ANNUAL_WORKING_DAYS = 313;

  // Position-based rate calculation
  // - Resident Veterinarian: Monthly formula (Salary / D)
  // - All others: Annual formula ((Salary × 12) / 313)
  function calculateEmployeeRates(
    salary: number,
    position: PositionType,
    branchDaysPerMonth: number,
    branchHoursPerDay: number
  ): { ratePerDay: number; ratePerHour: number } {
    if (position === PositionType.RESIDENT_VETERINARIAN) {
      // Monthly formula for Resident Veterinarian
      const ratePerDay = Math.round((salary / branchDaysPerMonth) * 100) / 100;
      const ratePerHour = Math.round((ratePerDay / branchHoursPerDay) * 100) / 100;
      return { ratePerDay, ratePerHour };
    } else {
      // Annual formula for all other positions: (Salary × 12) ÷ 313
      const annualSalary = salary * 12;
      const ratePerDay = Math.round((annualSalary / ANNUAL_WORKING_DAYS) * 100) / 100;
      const ratePerHour = Math.round((ratePerDay / 8) * 100) / 100;
      return { ratePerDay, ratePerHour };
    }
  }

  // Create branches
  const branchesData = [
    { name: 'Pet Hub Angeles', address: 'Lot 7A Pandan Road, Mining, Angeles City, Pampanga 2009', contact: '0917-129-1740', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Bacoor', address: 'Bacoor, Cavite', contact: '', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Baliwag', address: 'Baliwag, Bulacan', contact: '', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Bataan', address: 'Bataan', contact: '', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Lancaster', address: 'Lancaster, Cavite', contact: '', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Las Pinas', address: 'Las Pinas City', contact: '', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Paranaque', address: 'Paranaque City', contact: '', type: 'VETERINARY_CLINIC' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
    { name: 'Pet Hub Trading', address: 'Philippines', contact: '', type: 'TRADING' as const, workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH, workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY },
  ];

  const branches: Branch[] = [];
  for (const branchData of branchesData) {
    const branch = await prisma.branch.upsert({
      where: { 
        id: branchesData.indexOf(branchData) + 1,
      },
      update: branchData,
      create: branchData,
    });
    branches.push(branch);
    console.log('Created branch:', branch.name);
  }

  // Create sample employees for Angeles branch
  const angelesBranch = branches[0];

  if (angelesBranch) {
    const employeesData = [
      {
        name: 'Dr. Karmella Joy B. Mamangun',
        position: 'RESIDENT_VETERINARIAN' as const,
        salary: 45000,
        address: 'San Pedro II, Magalang, Pampanga',
        hiredOn: new Date('2024-04-19'),
      },
      {
        name: 'Dr. Ian Carlo Antonio',
        position: 'JUNIOR_VETERINARIAN' as const,
        salary: 35000,
        address: 'Sta. Maria, Magalang, Pampanga',
        hiredOn: new Date('2025-11-15'),
      },
      {
        name: 'Dr. Grace Mary D. Fogata',
        position: 'JUNIOR_VETERINARIAN' as const,
        salary: 40000,
        address: 'Dona Belen Subd., Angeles City, Pampanga',
        hiredOn: new Date('2021-07-10'),
      },
      {
        name: 'Nico Cabilangan',
        position: 'GROOMER' as const,
        salary: 16000,
        address: 'Concepcion, Tarlac',
        hiredOn: new Date('2025-09-11'),
      },
      {
        name: 'Jerold Andaya',
        position: 'GROOMER_VET_ASSISTANT' as const,
        salary: 14300,
        address: '725 Ma. Teresita St Sta Clara Subd',
        hiredOn: new Date('2025-05-28'),
      },
      {
        name: 'Philip Ganaden',
        position: 'VETERINARY_ASSISTANT' as const,
        salary: 15500,
        address: 'San Francisco, Agoo, La Union',
        hiredOn: new Date('2022-11-22'),
      },
    ];

    for (let i = 0; i < employeesData.length; i++) {
      const emp = employeesData[i];
      // Calculate rates based on position:
      // - Resident Veterinarian: Salary / D (branch working days)
      // - All others: (Salary × 12) / 313 (annual formula)
      const { ratePerDay, ratePerHour } = calculateEmployeeRates(
        emp.salary,
        emp.position,
        DEFAULT_WORKING_DAYS_PER_MONTH,
        DEFAULT_WORKING_HOURS_PER_DAY
      );

      const employee = await prisma.employee.upsert({
        where: { id: i + 1 },
        update: {
          ...emp,
          branchId: angelesBranch.id,
          ratePerDay,
          ratePerHour,
        },
        create: {
          ...emp,
          branchId: angelesBranch.id,
          ratePerDay,
          ratePerHour,
        },
      });
      console.log('Created employee:', employee.name);

      // Add fixed deductions for each employee
      const deductionTypes = ['SSS', 'PHILHEALTH', 'PAGIBIG'];
      const deductionAmounts: Record<string, number> = {
        SSS: emp.salary >= 20000 ? 500 : emp.salary >= 15000 ? 400 : 300,
        PHILHEALTH: emp.salary >= 20000 ? 250 : emp.salary >= 15000 ? 200 : 150,
        PAGIBIG: 100,
      };

      for (const type of deductionTypes) {
        await prisma.fixedDeduction.upsert({
          where: {
            employeeId_type: {
              employeeId: employee.id,
              type,
            },
          },
          update: { amount: deductionAmounts[type] },
          create: {
            employeeId: employee.id,
            type,
            amount: deductionAmounts[type],
          },
        });
      }
    }
  }

  // Seed incentive configurations
  console.log('Seeding incentive configurations...');
  for (const config of DEFAULT_INCENTIVE_CONFIG) {
    await prisma.incentiveConfig.upsert({
      where: { type: config.type },
      update: {
        name: config.name,
        rate: config.rate,
        formulaType: config.formulaType,
        description: config.description,
        positions: config.positions,
        sortOrder: config.sortOrder,
      },
      create: {
        type: config.type,
        name: config.name,
        rate: config.rate,
        formulaType: config.formulaType,
        description: config.description,
        positions: config.positions,
        sortOrder: config.sortOrder,
      },
    });
    console.log('Created incentive config:', config.type);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
