# Pet Hub Payroll System — Complete System Index

> **Purpose**: This document is the single source of truth for any AI assistant working on this codebase. It covers architecture, business logic, database schema, API endpoints, frontend structure, calculation formulas, and deployment.

---

## 1. System Overview

**Pet Hub Payroll** is a web-based payroll management system for **Pet Hub Philippines Corporation**, a chain of veterinary clinics and a trading branch. It replaced an Excel-based payroll workflow that managed 8+ branches.

**Core capabilities:**
- Multi-branch employee management (8 branches)
- Semi-monthly payroll period creation and calculation
- Position-specific incentive systems (veterinarians, groomers, assistants, trading staff)
- Fixed & per-period deduction management (government, insurance, loans)
- Cash advance tracking
- Printable payslip generation
- Dashboard with branch-level statistics

---

## 2. Tech Stack

| Layer | Technology | Version (approx.) |
|-------|-----------|-------------------|
| **Frontend** | React + TypeScript | React 19, TS 5.9 |
| **Build Tool** | Vite | 7.x |
| **Styling** | TailwindCSS | 4.x |
| **State/Data** | TanStack React Query | 5.x |
| **Forms** | React Hook Form + Zod | 7.x / 4.x |
| **Icons** | Lucide React | 0.562 |
| **Routing** | React Router DOM | 7.x |
| **Print** | react-to-print | 3.x |
| **HTTP Client** | Axios | 1.x |
| **Backend** | Node.js + Express + TypeScript | Express 5.x, TS 5.9 |
| **ORM** | Prisma | 7.x (with `@prisma/adapter-pg`) |
| **Database** | PostgreSQL | 14+ |
| **Auth** | JWT (jsonwebtoken) + bcryptjs | — |
| **Security** | Helmet, express-rate-limit, CORS | — |
| **Deployment** | Railway (Nixpacks) | — |

---

## 3. Project Structure

**Architecture**: Modular Monolith (Services + Calculators + Thin Routes)

```
PHPS/
├── README.md
├── SYSTEM_INDEX.md
├── RAILWAY_DEPLOYMENT.md
├── .github/workflows/backend-ci.yml   # CI/CD pipeline
├── backend/
│   ├── .env / .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma.config.ts
│   ├── nixpacks.toml
│   ├── vitest.config.ts               # Test runner config
│   ├── prisma/
│   │   ├── schema.prisma              # 14 models, 6 enums
│   │   ├── seed.ts
│   │   └── migrations/                # Prisma Migrate baseline
│   └── src/
│       ├── index.ts                   # Dev server entry point
│       ├── app.ts                     # Express app (shared middleware + routes)
│       ├── server.ts                  # Production entry point
│       ├── shared/                    # Cross-cutting infrastructure
│       │   ├── database/prisma.ts     # Single PrismaClient singleton
│       │   ├── errors/                # AppError, NotFoundError, etc.
│       │   ├── middleware/             # auth, validation, error handler
│       │   ├── types/common.types.ts  # TxClient type
│       │   └── utils/
│       │       ├── logger.ts          # Winston structured logger
│       │       └── monetary.utils.ts  # MonetaryRules (round/truncate)
│       ├── modules/                   # Domain modules (Modular Monolith)
│       │   ├── payroll/
│       │   │   ├── payroll.routes.ts
│       │   │   ├── payroll.service.ts
│       │   │   ├── payroll.schema.ts
│       │   │   └── calculators/
│       │   │       ├── payroll.calculator.ts
│       │   │       ├── rate.calculator.ts
│       │   │       └── recalculation.service.ts  # CENTRALIZED
│       │   ├── incentives/
│       │   │   ├── incentive.routes.ts
│       │   │   ├── incentive.service.ts
│       │   │   ├── incentive.schema.ts
│       │   │   └── calculators/incentive.calculator.ts
│       │   ├── incentive-sheets/
│       │   │   ├── incentive-sheet.routes.ts
│       │   │   ├── incentive-sheet.service.ts
│       │   │   ├── incentive-sheet.config.ts
│       │   │   └── calculators/distribution.calculator.ts
│       │   ├── deductions/
│       │   │   ├── deduction.routes.ts
│       │   │   └── deduction.service.ts
│       │   ├── cash-advances/
│       │   │   ├── cashAdvance.routes.ts
│       │   │   └── cashAdvance.service.ts
│       │   ├── employees/
│       │   │   ├── employee.routes.ts
│       │   │   └── employee.service.ts
│       │   ├── branches/
│       │   │   ├── branch.routes.ts
│       │   │   └── branch.service.ts
│       │   └── dashboard/
│       │       ├── dashboard.routes.ts
│       │       └── dashboard.service.ts
│       └── routes/
│           └── auth.routes.ts         # Preserved (simple JWT logic)
│
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── context/AuthContext.tsx
│       ├── types/index.ts
│       ├── utils/
│       │   ├── api.ts
│       │   └── helpers.ts
│       ├── pages/
│       │   ├── Login.tsx, Dashboard.tsx, Branches.tsx
│       │   ├── Employees.tsx, Payroll.tsx
│       │   ├── Payslip.tsx, Payslips.tsx
│       │   ├── CashAdvances.tsx, IncentiveConfig.tsx
│       └── components/
│           ├── layout/Layout.tsx, Header.tsx, Sidebar.tsx
│           ├── FixedDeductionsModal.tsx
│           ├── IncentiveCalculatorModal.tsx
│           ├── IncentiveExclusionsModal.tsx
│           └── IncentiveSheetModal.tsx
│
├── report/                            # Project documentation
│   ├── SYSTEM_CONTEXT.md
│   ├── ARCHITECTURE_STYLE_REFACTORING.md
│   └── CURRENT_PROGRESS.md
└── tests/                             # Test suites
    ├── characterization/
    ├── unit/
    ├── integration/
    └── smoke/
```

---

## 4. Database Schema (Prisma)

### 4.1 Enums

| Enum | Values |
|------|--------|
| `UserRole` | `ADMIN`, `BRANCH_MANAGER`, `ACCOUNTING` |
| `PayrollStatus` | `DRAFT`, `PENDING`, `APPROVED`, `PAID` |
| `BranchType` | `VETERINARY_CLINIC`, `VETERINARY_HOSPITAL`, `TRADING` |
| `PositionType` | `RESIDENT_VETERINARIAN`, `JUNIOR_VETERINARIAN`, `GROOMER`, `GROOMER_VET_ASSISTANT`, `VETERINARY_ASSISTANT`, `VETERINARY_NURSE`, `CLINIC_SECRETARY`, `STAFF` |

### 4.2 Models

#### `User`
- `id` (Int, PK, auto), `email` (unique), `password` (hashed), `name`, `role` (UserRole), `branchId?` → Branch

#### `Branch`
- `id`, `name`, `address`, `contact?`, `type` (BranchType), `isActive`, `workingDaysPerMonth` (default 22), `workingHoursPerDay` (default 8)
- Relations: employees[], users[], incentiveSheets[]

#### `Employee`
- `id`, `branchId` → Branch, `name`, `position` (PositionType)
- `salary` (Decimal 12,2), `ratePerDay` (Decimal 12,6), `ratePerHour` (Decimal 12,6)
- Government IDs: `sssNo?`, `tinNo?`, `philhealthNo?`, `pagibigNo?`
- `address?`, `hiredOn?`, `isActive`
- Relations: payrollPeriods[], fixedDeductions[], cashAdvances[], incentiveExclusions[]

#### `PayrollPeriod`
- `id`, `employeeId` → Employee, `startDate`, `endDate`
- Attendance: `workingDays`, `dayOff`, `absences`, `totalDaysPresent`
- `holidays` (Decimal 8,2 — supports fractional like 1.30), `deductionDivisor` (default 2)
- `overtimeHours`, `lateMinutes`
- Allowances: `mealAllowance`, `silPay`, `birthdayLeave`
- Calculated: `basicPay`, `holidayPay`, `overtimePay`, `totalIncentives`, `grossPay`, `totalDeductions`, `netPay`
- `status` (PayrollStatus)
- Relations: incentives[], deductions[], dailyInputs[]
- Unique: `[employeeId, startDate, endDate]`

#### `Incentive`
- `id`, `payrollId` → PayrollPeriod
- `type` (String), `count` (Decimal), `inputValue` (Decimal), `rate` (Decimal 12,4), `amount` (Decimal)
- `formula?` (human-readable string like "5 × ₱50 = ₱250"), `dateEarned?`

#### `IncentiveConfig`
- `id`, `type` (unique), `name`, `rate` (Decimal), `formulaType` ("COUNT_MULTIPLY" | "PERCENT")
- `description?`, `positions` (String[]), `isActive`, `sortOrder`

#### `IncentiveExclusion`
- `id`, `employeeId` → Employee, `incentiveType` (String)
- Unique: `[employeeId, incentiveType]`

#### `Deduction`
- `id`, `payrollId` → PayrollPeriod, `type` (String), `amount`, `notes?`

#### `FixedDeduction`
- `id`, `employeeId` → Employee, `type`, `category` ("GOVERNMENT" | "INSURANCE" | "LOANS" | "OTHERS")
- `amount`, `isActive`
- Unique: `[employeeId, type]`

#### `IncentiveSheet` (branch-level daily grid)
- `id`, `branchId` → Branch, `startDate`, `endDate`, `isDistributed`
- Relations: dailyInputs[]
- Unique: `[branchId, startDate, endDate]`

#### `DailyIncentiveInput`
- `id`, `incentiveSheetId` → IncentiveSheet, `date`, `type`, `value`
- Unique: `[incentiveSheetId, date, type]`

#### `EmployeeDailyInput` (individual tracking)
- `id`, `payrollId` → PayrollPeriod, `date`, `type`, `value`
- Unique: `[payrollId, date, type]`

#### `CashAdvance`
- `id`, `employeeId` → Employee, `amount`, `dateTaken`, `dateDeducted?`, `isPaid`, `notes?`

---

## 5. Payroll Calculation Formulas

All logic lives in `backend/src/utils/payrollCalculations.ts`.

### 5.1 Rate Calculation (Position-Based)

| Position | Formula | Constants |
|----------|---------|-----------|
| **Resident Veterinarian** | Monthly: `Rate/Day = Salary ÷ D` | D = branch workingDaysPerMonth (default 22) |
| **All Other Positions** | Annual: `Rate/Day = (Salary × 12) ÷ 313` | 313 = annual working days constant |
| Both | `Rate/Hour = Rate/Day ÷ H` | H = branch workingHoursPerDay (default 8) |

### 5.2 Pay Calculations

```
Basic Pay      = Rate/Day × Total Days Present
Holiday Pay    = Holidays × Rate/Day           (TRUNCATED to 2 decimals, not rounded)
Overtime Pay   = Rate/Hour × OT Hours
Late Deduction = Rate/Hour × (Late Minutes ÷ 60)

Gross Pay = Basic Pay + Holiday Pay + OT Pay + Total Incentives
          + Meal Allowance + SIL Pay + Birthday Leave

Net Pay   = Gross Pay - Total Deductions - Late Deduction  (TRUNCATED to 2 decimals)
```

> **Important**: Holiday Pay and Net Pay use `Math.floor(x * 100) / 100` (truncation), NOT rounding. All other values use standard `Math.round(x * 100) / 100`.

### 5.3 Days Present

```
Total Days Present = Working Days - Day Off - Absences
```

---

## 6. Incentive System

### 6.1 Formula Types

| Type | Calculation | Example |
|------|-------------|---------|
| `COUNT_MULTIPLY` | `count × rate` | 5 CBC × ₱50 = ₱250 |
| `PERCENT` | `inputValue × rate` | ₱34,550 Surgery × 10% = ₱3,455 |

### 6.2 Incentive Configuration

| Type | Rate | Formula | Eligible Positions | Shared? |
|------|------|---------|-------------------|---------|
| CBC | ₱50 | COUNT_MULTIPLY | Resident Vet, Junior Vet | No |
| Blood Chem | ₱100 | COUNT_MULTIPLY | Resident Vet, Junior Vet | No |
| Ultrasound | ₱100 | COUNT_MULTIPLY | Resident Vet, Junior Vet | No |
| Test Kits | ₱50 | COUNT_MULTIPLY | Resident Vet, Junior Vet | No |
| X-Ray | ₱100 | COUNT_MULTIPLY | Resident Vet, Junior Vet | No |
| Surgery | 10% | PERCENT | Resident Vet, Junior Vet, Vet Asst, Vet Nurse, Staff, Groomer | No |
| Emergency | 40% | PERCENT | Resident Vet, Junior Vet, Vet Asst, Vet Nurse, Staff, Groomer | No |
| Confinement (Vet) | ₱55 | COUNT_MULTIPLY | Only Resident Vet receives; divided by ALL vets count | **Yes** |
| Confinement (Asst) | ₱45 | COUNT_MULTIPLY | Vet Asst, Groomer/Vet Asst, Vet Nurse, Staff, Groomer | **Yes** |
| Grooming | ₱75 | COUNT_MULTIPLY | Groomer, Groomer/Vet Asst | **Yes** |
| Nursing | ₱80 | COUNT_MULTIPLY | Vet Nurse, Vet Asst, Staff, Groomer | **Yes** |

**Shared incentives**: Total is divided equally among eligible employees in the branch.

### 6.3 Incentive Sheet (Branch-Level Daily Grid)

The `IncentiveSheet` model allows branch-level daily input of shared incentive values (Grooming, Surgery, Emergency, Confinement). After data entry, the system can **distribute** these totals to individual employee payroll records based on eligibility.

### 6.4 Incentive Exclusions

Individual employees can be excluded from specific incentive types via `IncentiveExclusion` records.

---

## 7. Deduction System

### 7.1 Deduction Categories

| Category | Types |
|----------|-------|
| Government | SSS, PhilHealth, Pag-IBIG, W/Tax |
| Insurance | Sunlife, BPI AIA, Other Insurance |
| Loans | SSS Loan, Pag-IBIG Loan, Company Loan |
| Others | Uniform, Cash Advance, Late, Others |

### 7.2 Fixed Deductions

Employees have `FixedDeduction` records that are **automatically applied** when a payroll period is created. The amount is divided by the `deductionDivisor` (default 2 for semi-monthly):

```
Applied Amount = Fixed Deduction Amount ÷ deductionDivisor
```

---

## 8. API Endpoints

Base URL: `http://localhost:3001/api`

All endpoints except `/auth/login` and `/api/health` require JWT Bearer token.

### 8.1 Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | No (rate-limited: 10/15min prod) | Returns `{ token, user }` |
| POST | `/register` | Admin only | Create new user |
| GET | `/me` | Yes | Get current user profile |

**JWT**: 8-hour expiry, payload: `{ id, email, role, branchId? }`

### 8.2 Branches (`/api/branches`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all branches |
| GET | `/:id` | Get branch by ID |
| POST | `/` | Create branch |
| PUT | `/:id` | Update branch |
| DELETE | `/:id` | Delete branch |

### 8.3 Employees (`/api/employees`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List employees (filter: `?branchId=`) |
| GET | `/:id` | Get employee by ID |
| POST | `/` | Create employee (auto-calculates rates) |
| PUT | `/:id` | Update employee |
| DELETE | `/:id` | Delete employee |
| GET | `/:id/fixed-deductions` | Get fixed deductions |
| PUT | `/:id/fixed-deductions` | Update fixed deductions |
| GET | `/:id/incentive-exclusions` | Get incentive exclusions |
| POST | `/:id/incentive-exclusions` | Toggle incentive exclusion |

### 8.4 Payroll (`/api/payroll`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List payrolls (filter: `?branchId=&startDate=&endDate=&status=`) |
| GET | `/:id` | Get payroll with employee, incentives, deductions |
| POST | `/create-period` | Create payroll for all active employees in a branch |
| PUT | `/:id` | Update payroll fields → auto-recalculates |
| POST | `/:id/calculate` | Force recalculation |
| DELETE | `/:id` | Delete payroll |

### 8.5 Incentives (`/api/incentives`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/config` | Get all incentive configs |
| GET | `/config/position/:position` | Get configs for position |
| PUT | `/config/:type` | Update incentive config |
| POST | `/config/init` | Initialize default configs |
| GET | `/payroll/:payrollId` | Get incentives for payroll |
| POST | `/` | Create incentive |
| PUT | `/payroll/:payrollId/bulk` | Bulk update incentives |
| DELETE | `/:id` | Delete incentive |
| POST | `/calculate` | Calculate incentives preview |
| GET | `/eligible-counts/:branchId` | Get eligible employee counts |

### 8.6 Incentive Sheets (`/api/incentive-sheets`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get sheet (`?branchId=&startDate=&endDate=`) |
| PUT | `/:sheetId/inputs` | Save daily inputs |
| POST | `/:sheetId/distribute` | Distribute to employee payrolls |
| GET | `/config` | Get sheet config |

### 8.7 Deductions (`/api/deductions`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/payroll/:payrollId` | Get deductions for payroll |
| POST | `/` | Create deduction |
| POST | `/bulk` | Bulk update deductions |
| POST | `/apply-fixed/:payrollId` | Apply fixed deductions |
| PUT | `/divisor/:payrollId` | Update deduction divisor |
| DELETE | `/:id` | Delete deduction |

### 8.8 Cash Advances (`/api/cash-advances`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List (filter: `?employeeId=&isPaid=`) |
| GET | `/:id` | Get by ID |
| POST | `/` | Create cash advance |
| PUT | `/:id` | Update |
| POST | `/:id/mark-paid` | Mark as paid |
| DELETE | `/:id` | Delete |
| GET | `/employee/:employeeId/unpaid` | Get unpaid advances |

### 8.9 Dashboard (`/api/dashboard`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard statistics (`?branchId=`) |
| GET | `/payroll-summary` | Payroll summary (`?startDate=&endDate=&branchId=`) |

### 8.10 Health (`/api/health`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Returns `{ status, timestamp, database, environment }` |

---

## 9. Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `Login` | Login page (no layout) |
| `/` | `Dashboard` | Branch overview with stats |
| `/branches` | `Branches` | Branch CRUD |
| `/employees` | `Employees` | Employee management |
| `/payroll` | `Payroll` | Main payroll processing (largest page) |
| `/cash-advances` | `CashAdvances` | Cash advance tracking |
| `/payslips` | `Payslips` | Payslip listing |
| `/payslips/:id` | `Payslip` | Individual payslip view/print |
| `/incentive-config` | `IncentiveConfig` | Manage incentive rates |

---

## 10. Authentication & Security

- **Auth flow**: Login → JWT stored in `localStorage` → Axios interceptor adds `Bearer` token → 401 response auto-redirects to `/login`
- **Password hashing**: bcryptjs with salt rounds = 10
- **Rate limiting**: General: 1000 req/15min (dev) / 100 (prod); Auth: 100 (dev) / 10 (prod)
- **CORS**: Configurable via `CORS_ORIGINS` env var
- **Helmet**: HTTP security headers
- **Role-based access**: `authMiddleware` (all authenticated), `adminOnly`, `requireRole(['ADMIN', ...])`
- **Roles**: ADMIN (full access), BRANCH_MANAGER, ACCOUNTING

---

## 11. Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/payroll_system
JWT_SECRET=<strong-random-string>
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5175
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 12. Database Connection

Uses `@prisma/adapter-pg` with a `pg.Pool`:
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s
- Logging: `['query', 'error', 'warn']` in dev, `['error']` in prod

---

## 13. Seed Data

Run: `cd backend && npm run db:seed`

Creates:
- **Admin user**: `admin@pethub.com` / `admin123` (ADMIN role)
- **Test user**: `test@pethub.com` / `test123` (ADMIN role)
- **8 Branches**: Angeles, Bacoor, Baliwag, Bataan, Lancaster, Las Pinas, Paranaque, Trading
- **6 Sample employees** in Angeles branch with fixed deductions (SSS, PhilHealth, Pag-IBIG)
- **11 Incentive configs** (all types listed in Section 6.2)

---

## 14. Branches

| # | Branch Name | Type | Location |
|---|------------|------|----------|
| 1 | Pet Hub Angeles | Veterinary Clinic | Angeles City, Pampanga |
| 2 | Pet Hub Bacoor | Veterinary Clinic | Bacoor, Cavite |
| 3 | Pet Hub Baliwag | Veterinary Clinic | Baliwag, Bulacan |
| 4 | Pet Hub Bataan | Veterinary Clinic | Bataan |
| 5 | Pet Hub Lancaster | Veterinary Clinic | Lancaster, Cavite |
| 6 | Pet Hub Las Pinas | Veterinary Clinic | Las Pinas City |
| 7 | Pet Hub Paranaque | Veterinary Clinic | Paranaque City |
| 8 | Pet Hub Trading | Trading | Philippines |

---

## 15. Deployment (Railway)

- **Backend**: Root dir `backend`, uses `nixpacks.toml` (Node 18)
  - Build: `npm ci → prisma generate → npm run build`
  - Start: `prisma migrate deploy && npm start`
- **Frontend**: Root dir `frontend`, builds with Vite, serves with `serve -s dist`
- **Database**: Railway PostgreSQL (auto-provides `DATABASE_URL`)
- Health check: `GET /api/health`

---

## 16. Key Patterns & Conventions

1. **Modular Monolith** — Routes → Services → Calculators → Prisma. Service layer extracts business logic from HTTP.
2. **Centralized Recalculation** — `RecalculationService.recalculate(payrollId, tx?)` is the single source of truth for payroll total updates.
3. **Thin Routes** — Route files delegate to services and handle only HTTP concerns (~30-80 lines each).
4. **Pure Calculators** — All calculation functions are stateless, side-effect-free pure functions (no DB, no HTTP).
5. **Transaction Propagation** — Services accept optional `tx?: Prisma.TransactionClient` for multi-step atomic operations.
6. **MonetaryRules** — All financial rounding/truncation uses `MonetaryRules` utility (no bare `Math.round` in business code).
7. **Zod Validation** — All new routes use Zod schemas via generic `validate()` middleware.
8. **Domain Errors** — `NotFoundError`, `ValidationError`, etc. thrown in services, mapped to HTTP by global error handler.
9. **Single PrismaClient** — One shared singleton with 20-connection pool.
10. **Prisma ORM** with PostgreSQL adapter (`@prisma/adapter-pg`)
11. **Currency** — Philippine Peso (PHP), formatted with `Intl.NumberFormat('en-PH')`
12. **TanStack Query** — 5-minute stale time, 1 retry
13. **Tailwind** v4 with custom color palette (primary = sky blue, accent = amber)
14. **Form validation**: React Hook Form + Zod resolvers
15. **Date handling**: `date-fns` library
16. **Print**: `react-to-print` for payslip generation

---

## 17. Testing

| Category | Count | Framework |
|----------|-------|-----------|
| Characterization (baseline) | 50 | vitest |
| Unit (calculators, schemas) | 50 | vitest |
| Integration (services) | 26 | vitest + test DB |
| API Smoke (supertest) | 12 | vitest + supertest |
| **Total** | **138** | |

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 18. Known Issues

---

## 19. Common Development Commands

```bash
# Backend
cd backend
npm install
npm run dev              # Start dev server (ts-node-dev, port 3001)
npm run build            # TypeScript compile
npm start                # Run compiled JS
npm test                 # Run all 138 tests
npm run test:watch       # Watch mode
npm run db:seed          # Seed database
npx prisma db push       # Push schema to DB (dev)
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create migration from schema changes
npx prisma migrate status # Check migration status

# Frontend
cd frontend
npm install
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
```

# Frontend
cd pet-hub-payroll/frontend
npm install
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
```

---

## 19. Excel Files Reference

The `excel/` directory contains the original Excel payroll files that this system replaces:
- PET HUB ANGELES PAYROLL
- PET HUB BACOOR PAYROLL
- PET HUB BALIWAG PAYROLL
- PET HUB BATAAN PAYROLL
- PET HUB LANCASTER PAYROLL
- PET HUB LAS PINAS PAYROLL
- PET HUB PARANAQUE PAYROLL
- PET HUB TRADING PAYROLL
- PET-HUB-OFFICE (Jan 26 - Feb 10, 2026)

These files are the source of truth for the payroll calculation formulas and incentive structures implemented in the system.
