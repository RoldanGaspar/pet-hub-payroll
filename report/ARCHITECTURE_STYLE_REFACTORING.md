# Pet Hub Payroll System — Architecture Style Refactoring Plan

> **Document Type**: Architecture Evolution & Implementation Roadmap (REVISED)  
> **Target**: Evolve PHPS from Fat Route Monolith → Modular Monolith with Service Layer  
> **Principle**: Improve internal organization, not replace the technology stack  
> **Revision**: v2.0 — incorporates architecture review feedback (2026-07-23)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Assessment](#2-current-architecture-assessment)
3. [Why Refactor Now](#3-why-refactor-now)
4. [Target Architecture: Modular Monolith](#4-target-architecture-modular-monolith)
5. [Layer Responsibilities](#5-layer-responsibilities)
6. [Target Project Structure](#6-target-project-structure)
7. [Before & After: Code Organization](#7-before--after-code-organization)
8. [Explicit Architecture Rules](#8-explicit-architecture-rules)
9. [Transaction Architecture](#9-transaction-architecture)
10. [Money Handling Rules](#10-money-handling-rules)
11. [Validation Strategy](#11-validation-strategy)
12. [Error Handling Strategy](#12-error-handling-strategy)
13. [Testing Strategy](#13-testing-strategy)
14. [Phased Implementation Plan](#14-phased-implementation-plan)
15. [Dependency & Call Flow Design](#15-dependency--call-flow-design)
16. [Risk Assessment & Mitigation](#16-risk-assessment--mitigation)
17. [Success Criteria](#17-success-criteria)
18. [Phase-by-Phase File Map](#18-phase-by-phase-file-map)

---

## 1. Executive Summary

### The Decision

| Question | Answer |
|----------|--------|
| Are we rewriting the system? | **No** |
| Are we moving to microservices? | **No** |
| Are we changing the tech stack? | **No** |
| Are we changing the database? | **No** |
| Are we changing the frontend? | **No** |
| Are we changing the deployment? | **No** |
| What ARE we changing? | **The internal organization of the backend code** |

### What Stays the Same

```
React 19 SPA          ✅ Keep
Vite 7                ✅ Keep
Express 5             ✅ Keep
TypeScript 5.9        ✅ Keep
Prisma 7              ✅ Keep
PostgreSQL            ✅ Keep
JWT Auth              ✅ Keep
REST API              ✅ Keep
Railway Deployment    ✅ Keep
TanStack Query        ✅ Keep
TailwindCSS           ✅ Keep
```

### What Changes

```
CURRENT                              TARGET
─────────────────────────────        ─────────────────────────────
Routes contain everything            Routes → (Controller) → Services
Business logic in HTTP handlers      Business logic in domain services
Calculations in route files          Calculations in dedicated calculators
No validation on most endpoints      Zod schemas on every endpoint
No transactions on multi-writes      Prisma $transaction wrapping
Recalculation duplicated 5x          One centralized RecalculationService
No tests                             Comprehensive test suite
Flat src/routes/ directory           Domain modules with clear boundaries
```

### Critical Rule: Refactoring ≠ Bug Fixing

| Activity | When | Commit Style |
|----------|------|-------------|
| **Move code** (no behavior change) | Phase A of each module | `refactor(module): extract X` |
| **Fix bugs** (intentional behavior change) | Phase B of each module | `fix(module): correct Y` |
| **Add validation** (new behavior) | During extraction | `feat(module): add Zod validation` |

---

## 2. Current Architecture Assessment

### Architecture Style: Fat Route / Transaction Script Monolith

```
┌─────────────────────────────────────────────┐
│               React SPA (Frontend)           │
│  Pages → API calls via Axios                 │
└──────────────────┬──────────────────────────┘
                   │ REST over HTTP /api/*
                   ▼
┌─────────────────────────────────────────────┐
│              Express 5 Backend               │
│                                              │
│  routes/auth.routes.ts       (120 lines)     │
│  routes/branch.routes.ts     (170 lines)     │
│  routes/employee.routes.ts   (618 lines) ←──┐│
│  routes/payroll.routes.ts    (363 lines)    ││
│  routes/incentive.routes.ts  (567 lines)    ││ All logic
│  routes/incentive-sheet.routes.ts (652)  ←──┘│ here
│  routes/deduction.routes.ts  (390 lines)     │
│  routes/cashAdvance.routes.ts (204 lines)    │
│  routes/dashboard.routes.ts  (165 lines)     │
│                                              │
│  utils/payrollCalculations.ts (521 lines)    │
│  utils/prisma.ts              (21 lines)     │
└──────────────────┬──────────────────────────┘
                   │ Prisma ORM
                   ▼
┌─────────────────────────────────────────────┐
│            PostgreSQL Database               │
└─────────────────────────────────────────────┘
```

### Current Weaknesses (Evidence-Based)

| # | Weakness | Evidence | Impact |
|---|----------|----------|--------|
| 1 | **Business logic in HTTP handlers** | Every *.routes.ts mixes HTTP + validation + DB + calculations | Untestable without Express; hard to trace bugs |
| 2 | **Recalculation duplicated 5x** | `recalculatePayrollTotals()` or equivalent inline code exists in 5 route files | Fix a bug in one place, five others remain broken |
| 3 | **No input validation** | `express-validator` installed but barely used; most routes use raw `req.body` | Invalid data reaches the database |
| 4 | **No transactions** | Multi-step operations like fixed-deduction sync touch 3+ tables without atomicity | Data inconsistency on partial failure |
| 5 | **Zero tests** | No *.test.ts, *.spec.ts files exist anywhere | Every change is a regression risk |
| 6 | **Giant route files** | `employee.routes.ts` (618), `incentive-sheet.routes.ts` (652) | Hard to navigate and modify |
| 7 | **Inconsistent error handling** | Every route has its own try/catch returning 500 | No structured error codes |
| 8 | **Calculation config misalignment** | Incentive-sheet distribution config differs from payrollCalculations config | Same incentive type → different results |

### Architecture Scores (Current)

| Dimension | Score /10 | Explanation |
|-----------|-----------|-------------|
| **Scalability (volume)** | 8 | Express + PostgreSQL handles 100+ branches easily |
| **Scalability (complexity)** | 4 | Adding new business rules is becoming risky |
| **Maintainability** | 5 | Simple to read but hard to modify safely |
| **Testability** | 3 | Business logic entangled with HTTP and DB |
| **Simplicity** | 9 | Very simple to understand the flow |
| **Data Integrity** | 5 | Missing transactions and validation |
| **Modularity** | 3 | Everything in routes; no domain boundaries |

---

## 3. Why Refactor Now

The system works today. The problem is **what happens tomorrow**.

### The Core Risk: Business Complexity Growth

```
TODAY:                              TOMORROW:
                                   
Payroll                             Payroll
Employee                            Employee
Incentive                           Incentive
Deduction                           Deduction
Cash Advance                        Cash Advance
Payslip                             Payslip
                                    Leave
  ← CURRENT ARCHITECTURE            Attendance
    can handle this                 Government Contributions
    but struggles with →            Loans
                                    Tax
                                    Approval Workflow
                                    Audit Logs
                                    Historical Rates
                                    Payroll Adjustments
                                    Bonuses
                                    13th Month Pay
                                    Reports
                                    Notifications
```

### Scenario: A Business Rule Changes

**Pet Hub decides**: "Resident Veterinarians now receive Surgery incentive at 12% (up from 10%). Effective January 2026, Junior Veterinarians use a different calculation."

**With Fat Routes**, a developer must find and modify 5-7 files. Risk: miss one → inconsistent payroll results.

**With Modular Monolith**, change the rate in one `SurgeryIncentiveCalculator`. Every endpoint gets the correct result.

---

## 4. Target Architecture: Modular Monolith

```
┌──────────────────────────────────────────────────────────┐
│                   React SPA (Frontend)                    │
│  Pages → Axios → TanStack Query → REST API               │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTPS /api/*
                        ▼
┌──────────────────────────────────────────────────────────┐
│                  Express 5 Backend                        │
│                 MODULAR MONOLITH                          │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │        Routes + Controllers (optional)          │     │
│  │  ┌─────────┐ ┌─────────┐ ┌───────────────────┐  │     │
│  │  │  auth   │ │ payroll │ │    incentives     │  │     │
│  │  │ routes  │ │ routes  │ │     routes        │  │     │
│  │  └────┬────┘ └────┬────┘ └────────┬──────────┘  │     │
│  │       │           │               │              │     │
│  │  Simple endpoints skip controller, complex       │     │
│  │  endpoints use controller for parse/transform    │     │
│  └───────┼───────────┼───────────────┼─────────────┘     │
│          │           │               │                    │
│          ▼           ▼               ▼                    │
│  ┌────────────────────────────────────────────────┐     │
│  │              Validation Layer                   │     │
│  │     Zod schemas + generic middleware            │     │
│  └────────────────────┬───────────────────────────┘     │
│                       │                                  │
│                       ▼                                  │
│  ┌────────────────────────────────────────────────┐     │
│  │              Service / Domain Layer             │     │
│  │  PayrollService  IncentiveService              │     │
│  │  EmployeeService DeductionService              │     │
│  │  BranchService    CashAdvanceService           │     │
│  │  DashboardService AuthService                  │     │
│  │  IncentiveSheetService                         │     │
│  │                                                │     │
│  │  Services orchestrate business flows.          │     │
│  │  They accept optional tx client for atomic ops │     │
│  └────────────────────┬───────────────────────────┘     │
│                       │                                  │
│                       ▼                                  │
│  ┌────────────────────────────────────────────────┐     │
│  │         Calculation / Domain Logic Layer        │     │
│  │  PayrollCalculator  IncentiveCalculator        │     │
│  │  RateCalculator     DistributionCalculator     │     │
│  │  RecalculationService                          │     │
│  │                                                │     │
│  │  Pure functions. No DB. No HTTP. No side fx.   │     │
│  │  All monetary operations use explicit rules.   │     │
│  └────────────────────┬───────────────────────────┘     │
│                       │                                  │
│                       ▼                                  │
│  ┌────────────────────────────────────────────────┐     │
│  │              Prisma / Data Access               │     │
│  │  Single shared prisma.ts instance               │     │
│  │  Services import it directly (no repository)    │     │
│  │  Transaction clients passed as parameter        │     │
│  └────────────────────┬───────────────────────────┘     │
└───────────────────────┼──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                      │
│  14 models, 6 enums (unchanged)                          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Layer Responsibilities

### Layer 1: Routes (`*.routes.ts`)

**Responsibility**: HTTP concerns ONLY

```typescript
// TARGET: Route delegates to service (thin ~15 lines)
router.put('/:id', authMiddleware, validate(updatePayrollSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await payrollService.updatePayroll(id, req.body);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});
```

**Rules**:
- Parse path params and query params
- Call middleware (auth, validation)
- Call service method
- Return HTTP response
- NEVER contain business logic
- NEVER query the database directly
- Maximum ~30 lines per handler

### Layer 2: Controllers (`*.controller.ts`) — OPTIONAL

**Only create a controller when** the route needs significant request parsing/transformation before calling a service.

**Skip controllers for** simple endpoints that do: parse ID → validate body → call service → return JSON. Those go: Route → Zod middleware → Service directly.

```typescript
// When to use: complex multi-source request parsing
export class IncentiveSheetController {
  static parseGetSheetRequest(req: AuthRequest) {
    const { branchId, startDate, endDate } = req.query;
    if (!branchId || !startDate || !endDate) {
      throw new ValidationError('branchId, startDate, and endDate are required');
    }
    return {
      branchId: parseInt(branchId as string),
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };
  }
}
```

### Layer 3: Services (`*.service.ts`)

**Responsibility**: Business logic orchestration and transaction coordination

```typescript
export class PayrollService {
  async updatePayroll(
    id: number, 
    data: UpdatePayrollDTO,
    tx?: Prisma.TransactionClient  // ← Optional tx for callers that need atomicity
  ): Promise<PayrollDTO> {
    const db = tx || prisma;
    
    const existing = await db.payrollPeriod.findUnique({
      where: { id },
      include: { employee: true, incentives: true, deductions: true },
    });
    if (!existing) throw new NotFoundError('PayrollPeriod', id);
    
    const totalIncentives = this.sumAmounts(existing.incentives);
    const totalDeductions = this.sumAmounts(existing.deductions);
    
    const result = PayrollCalculator.calculate({
      ratePerDay: Number(existing.employee.ratePerDay),
      ratePerHour: Number(existing.employee.ratePerHour),
      workingDays: data.workingDays ?? existing.workingDays,
      totalDaysPresent: data.totalDaysPresent ?? this.computeDaysPresent(existing, data),
      holidays: data.holidays ?? Number(existing.holidays),
      overtimeHours: data.overtimeHours ?? Number(existing.overtimeHours),
      lateMinutes: data.lateMinutes ?? Number(existing.lateMinutes),
      mealAllowance: data.mealAllowance ?? Number(existing.mealAllowance),
      silPay: data.silPay ?? Number(existing.silPay),
      birthdayLeave: data.birthdayLeave ?? Number(existing.birthdayLeave),
      totalIncentives,
      totalDeductions,
    });
    
    return db.payrollPeriod.update({
      where: { id },
      data: { ...data, ...result, totalIncentives, totalDeductions },
      include: { employee: { include: { branch: true } }, incentives: true, deductions: true },
    });
  }
}
```

**Rules**:
- Contain ALL business rules and orchestration logic
- Accept optional `tx?: Prisma.TransactionClient` parameter for transaction propagation
- Use `const db = tx || prisma` pattern
- Call calculators for pure computations
- NEVER return HTTP response objects — return domain DTOs
- Throw domain-specific errors (never HTTP status codes)

### Layer 4: Calculators (`calculators/*.calculator.ts`)

**Responsibility**: Pure computation — NO side effects, NO database access, NO HTTP calls

```typescript
export class PayrollCalculator {
  static calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    // Pure function. No Prisma. No Express. No side effects.
    const basicPay = input.ratePerDay * input.totalDaysPresent;
    const holidayPay = MonetaryRules.truncate(input.holidays * input.ratePerDay);
    const overtimePay = input.ratePerHour * input.overtimeHours;
    const lateDeduction = input.ratePerHour * (input.lateMinutes / 60);
    // ... etc.
  }
}
```

**Rules**:
- **Must be pure** — same input always produces same output
- **Must be stateless** — static methods, no instance state
- Never access Prisma, Express, file system, or network
- All monetary operations use explicit `MonetaryRules.round()` / `MonetaryRules.truncate()`

---

## 6. Target Project Structure

```
backend/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── prisma.config.ts
├── nixpacks.toml
│
├── prisma/
│   ├── schema.prisma                    # Unchanged
│   ├── seed.ts                          # Uses DIRECT Prisma (not services)
│   └── migrations/                      # NEW: Proper Prisma Migrate (Production Hardening track)
│
└── src/
    ├── server.ts                        # NEW: Server bootstrap (listen, shutdown)
    ├── app.ts                           # NEW: Express app setup (middleware registration, route mounting)
    │
    ├── shared/                          # Shared across all modules
    │   ├── database/
    │   │   └── prisma.ts                # PrismaClient instance (unchanged)
    │   ├── middleware/
    │   │   ├── auth.middleware.ts        # JWT verify + RBAC (moved)
    │   │   ├── error.middleware.ts       # NEW: Global error handler
    │   │   └── validation.middleware.ts  # NEW: Generic Zod validation middleware factory
    │   ├── errors/
    │   │   ├── AppError.ts              # NEW: Base error class
    │   │   ├── NotFoundError.ts         # NEW: 404 domain error
    │   │   ├── ValidationError.ts       # NEW: 400 domain error
    │   │   ├── ConflictError.ts         # NEW: 409 domain error
    │   │   └── UnauthorizedError.ts     # NEW: 401 domain error
    │   ├── types/
    │   │   └── common.types.ts          # NEW: Shared DTOs, pagination
    │   └── utils/
    │       └── monetary.utils.ts        # NEW: MonetaryRules — explicit rounding/truncation
    │
    └── modules/                         # Domain modules
        ├── auth/
        │   ├── auth.routes.ts
        │   ├── auth.service.ts
        │   └── auth.schema.ts
        │
        ├── branches/
        │   ├── branch.routes.ts
        │   ├── branch.service.ts
        │   └── branch.schema.ts
        │
        ├── employees/
        │   ├── employee.routes.ts
        │   ├── employee.service.ts
        │   └── employee.schema.ts
        │
        ├── payroll/
        │   ├── payroll.routes.ts
        │   ├── payroll.service.ts
        │   ├── payroll.schema.ts
        │   └── calculators/
        │       ├── payroll.calculator.ts
        │       ├── rate.calculator.ts
        │       └── recalculation.service.ts    # CENTRALIZED
        │
        ├── incentives/
        │   ├── incentive.routes.ts
        │   ├── incentive.service.ts
        │   ├── incentive.schema.ts
        │   └── calculators/
        │       ├── incentive.calculator.ts
        │       └── incentive-config.service.ts
        │
        ├── incentive-sheets/
        │   ├── incentive-sheet.routes.ts
        │   ├── incentive-sheet.controller.ts   # Has controller (complex parsing)
        │   ├── incentive-sheet.service.ts
        │   ├── incentive-sheet.schema.ts
        │   ├── incentive-sheet.config.ts
        │   └── calculators/
        │       └── distribution.calculator.ts
        │
        ├── deductions/
        │   ├── deduction.routes.ts
        │   ├── deduction.service.ts
        │   └── deduction.schema.ts
        │
        ├── cash-advances/
        │   ├── cashAdvance.routes.ts
        │   ├── cashAdvance.service.ts
        │   └── cashAdvance.schema.ts
        │
        └── dashboard/
            ├── dashboard.routes.ts
            ├── dashboard.service.ts
            └── dashboard.schema.ts
```

### Key: Controllers Are Optional

| Module | Has Controller? | Why |
|--------|----------------|-----|
| auth | No | Simple: parse body, call service |
| branches | No | Simple CRUD |
| employees | No | Simple CRUD (now thin after extraction) |
| payroll | No | Simple: parse ID, validate body, call service |
| incentives | No | Simple CRUD |
| **incentive-sheets** | **Yes** | Complex query param parsing (branchId, date ranges), multi-source input |
| deductions | No | Simple CRUD |
| cash-advances | No | Simple CRUD |
| dashboard | No | Simple: query params → service |

### What Stays in seed.ts

`prisma/seed.ts` uses **direct Prisma**, not services:

```typescript
// ✅ CORRECT: seed.ts uses direct Prisma for deterministic bootstrap data
await prisma.branch.upsert({ where: { id: 1 }, update: branchData, create: branchData });
await prisma.incentiveConfig.upsert({ where: { type: config.type }, update: config, create: config });

// ❌ AVOID: Don't route seed data through services
// await branchService.create(branchData); // Services may trigger recalc, audit, rules
```

Seed scripts need to be deterministic, idempotent, fast, and independent of business workflow rules.

---

## 7. Before & After: Code Organization

### BEFORE: Payroll Update (70+ lines in route)

```typescript
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const { workingDays, dayOff, absences, holidays, ... } = req.body;
    
    const existing = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true, incentives: true, deductions: true },
    });
    if (!existing) return res.status(404).json({ error: 'Payroll not found' });
    
    const totalIncentives = existing.incentives.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalDeductions = existing.deductions.reduce((sum, d) => sum + Number(d.amount), 0);
    
    const calculation = calculatePayroll({ /* 15 fields */ });
    
    const payroll = await prisma.payrollPeriod.update({
      where: { id: parseInt(id) },
      data: { /* 20 fields */ },
      include: { employee: { include: { branch: true } }, incentives: true, deductions: true },
    });
    
    return res.json(payroll);
  } catch (error) {
    console.error('Update payroll error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### AFTER: Payroll Update (~15 lines in route)

**`modules/payroll/payroll.schema.ts`**:
```typescript
export const updatePayrollSchema = z.object({
  workingDays: z.number().int().min(0).optional(),
  dayOff: z.number().int().min(0).optional(),
  absences: z.number().int().min(0).optional(),
  holidays: z.number().min(0).optional(),
  overtimeHours: z.number().min(0).optional(),
  lateMinutes: z.number().min(0).optional(),
  mealAllowance: z.number().min(0).optional(),
  silPay: z.number().min(0).optional(),
  birthdayLeave: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PAID']).optional(),
});
```

**`modules/payroll/payroll.routes.ts`**:
```typescript
const router = Router();
const payrollService = new PayrollService();

router.put('/:id', authMiddleware, validate(updatePayrollSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await payrollService.updatePayroll(id, req.body);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});
```

**`modules/payroll/payroll.service.ts`** — business logic only (shown in Section 5).

| Aspect | Before | After |
|--------|--------|-------|
| **Route file length** | 70+ lines | ~15 lines |
| **Validation** | None (raw req.body) | Zod schema (type-safe) |
| **Business logic** | In route handler | In PayrollService |
| **Calculation** | Inline in route | In PayrollCalculator (pure) |
| **Transaction safety** | None | tx parameter for multi-step callers |
| **Error handling** | Inline 500 | Domain errors → global handler |
| **Testability** | Need Express + DB | Calculator: pure function test; Service: mock tx client |

---

## 8. Explicit Architecture Rules

These rules are **mandatory** and must not be violated during the refactor.

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **Refactoring commits MUST NOT change behavior** | Characterization tests run before and after; must produce identical results |
| 2 | **Bug fix commits MUST be separate from refactor commits** | Different commit type prefix: `refactor()` vs `fix()` |
| 3 | **Calculators MUST be pure functions** | No prisma import, no Express import, no fs, no network |
| 4 | **Services accept optional `tx?: Prisma.TransactionClient`** | Pattern: `const db = tx || prisma` |
| 5 | **$transaction() only for multi-step writes** | Single update → direct call; 3+ writes → $transaction |
| 6 | **ALL monetary conversions use `MonetaryRules`** | `MonetaryRules.round()` / `MonetaryRules.truncate()` — no bare `Math.round()` in business code |
| 7 | **Routes NEVER import Prisma directly** | Only services access the database |
| 8 | **Services NEVER return HTTP response objects** | Return plain DTOs; routes handle HTTP formatting |
| 9 | **API response shape MUST NOT change** | Snapshot tests verify before/after identical shape |
| 10 | **Every Zod schema has a test** | Valid input passes; each invalid field fails with correct message |

---

## 9. Transaction Architecture

### The Problem

When `IncentiveSheetService.distribute()` calls `IncentiveService.upsertIncentive()` and `RecalculationService.recalculate()`, these must share the same transaction client or the operation is not atomic.

### The Solution: Transaction Client Propagation

Every service that participates in multi-step writes accepts an optional transaction client:

```typescript
// TransactionClient type alias
import { Prisma, PrismaClient } from '@prisma/client';
export type TxClient = PrismaClient | Prisma.TransactionClient;
```

```typescript
// RecalculationService — accepts optional tx
export class RecalculationService {
  async recalculate(payrollId: number, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    
    const payroll = await db.payrollPeriod.findUnique({
      where: { id: payrollId },
      include: { employee: true, incentives: true, deductions: true },
    });
    if (!payroll) return;
    
    const totalIncentives = this.sumAmounts(payroll.incentives);
    const totalDeductions = this.sumAmounts(payroll.deductions);
    
    const result = PayrollCalculator.calculate({ /* ... */ });
    
    await db.payrollPeriod.update({
      where: { id: payrollId },
      data: { /* ...result... */ },
    });
  }
}
```

```typescript
// IncentiveSheetService — orchestrates transaction
export class IncentiveSheetService {
  async distribute(sheetId: number): Promise<DistributionResult> {
    const sheet = await prisma.incentiveSheet.findUnique({
      where: { id: sheetId },
      include: { dailyInputs: true },
    });
    if (!sheet) throw new NotFoundError('IncentiveSheet', sheetId);
    
    // ONE transaction for the complete distribution
    return prisma.$transaction(async (tx) => {
      const results: DistributionResult[] = [];
      
      for (const dist of this.computeDistributions(sheet)) {
        // Pass tx to IncentiveService
        const incentive = await incentiveService.upsertIncentive(
          dist.payrollId, dist.type, dist.amount, dist.formula, tx
        );
        results.push(incentive);
      }
      
      // Pass tx to RecalculationService
      for (const payrollId of this.getAffectedPayrollIds(results)) {
        await recalculationService.recalculate(payrollId, tx);
      }
      
      // Mark sheet distributed — using tx
      await tx.incentiveSheet.update({
        where: { id: sheetId },
        data: { isDistributed: true },
      });
      
      return { payments: results };
    });
  }
}
```

### When to Use Transactions

| Operation | Transaction? | Reason |
|-----------|-------------|--------|
| Create payroll period + apply fixed deductions | **Yes** | Creates PayrollPeriod + N Deduction records |
| Update fixed deductions + sync all payrolls | **Yes** | Deletes + creates deductions across multiple payrolls |
| Incentive bulk update + recalculate | **Yes** | Delete all incentives + create new + recalculate |
| Distribute incentive sheet | **Yes** | Creates N Incentive records + M recalculations + marks sheet |
| Cash advance mark-paid + add deduction | **Yes** | Updates CashAdvance + creates Deduction + recalculates |
| Branch settings change + employee rate recalc | **Yes** | Updates Branch + multiple Employee records |
| Single incentive create | **No** | Single record write |
| Single deduction create | **No** | Single record write |
| Single payroll update | **No** | Single record update |
| Simple CRUD (create branch, create employee) | **No** | Single record creation |

---

## 10. Money Handling Rules

### The Rule

Every conversion between Prisma `Decimal` and JavaScript `number` must happen at an **explicit boundary**, with an **explicit rounding or truncation policy**, and must **never** use bare JavaScript arithmetic for final monetary values.

### The Boundary

```
┌─────────────────────────────────────────────────┐
│           PostgreSQL DECIMAL(12,2)               │
│           (exact decimal storage)                │
└────────────────────┬────────────────────────────┘
                     │ Prisma returns as Prisma.Decimal
                     ▼
┌─────────────────────────────────────────────────┐
│  BOUNDARY: Service layer converts to number      │
│  using MonetaryRules.toNumber(decimal)           │
│  ONLY at the point where calculation begins      │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  DOMAIN: Calculator uses JavaScript numbers      │
│  BUT all results go through:                     │
│  MonetaryRules.round(value)                      │
│  MonetaryRules.truncate(value)                   │
│  before being returned                           │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  BOUNDARY: Service converts back to Decimal      │
│  before writing to database                      │
└─────────────────────────────────────────────────┘
```

### MonetaryRules Utility

```typescript
// shared/utils/monetary.utils.ts
export class MonetaryRules {
  /** Standard rounding: 2 decimal places, half-up */
  static round(value: number): number {
    return Math.round(value * 100) / 100;
  }
  
  /** Truncation (floor): for Holiday Pay and Net Pay per Pet Hub spec */
  static truncate(value: number): number {
    return Math.floor(value * 100) / 100;
  }
  
  /** Convert Prisma Decimal to number at the boundary */
  static fromDecimal(value: any): number {
    return Number(value);
  }
  
  /** Format for display (no calculation uses this) */
  static format(value: number): string {
    return value.toFixed(2);
  }
}
```

### Where Each Rule Applies (per Pet Hub Spec)

| Payroll Component | Rule | Implementation |
|-------------------|------|---------------|
| Basic Pay | Round to 2 decimals | `MonetaryRules.round()` |
| Holiday Pay | **Truncate** to 2 decimals | `MonetaryRules.truncate()` |
| Overtime Pay | Round to 2 decimals | `MonetaryRules.round()` |
| Late Deduction | Round to 2 decimals | `MonetaryRules.round()` |
| Gross Pay | Round to 2 decimals | `MonetaryRules.round()` |
| Net Pay | **Truncate** to 2 decimals | `MonetaryRules.truncate()` |
| Incentive Amounts | Round to 2 decimals | `MonetaryRules.round()` |
| Deduction Amounts | Round to 2 decimals | `MonetaryRules.round()` |
| Rate/Day, Rate/Hour | Round to 6 decimals | `Math.round(value * 1_000_000) / 1_000_000` |

### Enforcement

```typescript
// ✅ CORRECT
const holidayPay = MonetaryRules.truncate(holidays * ratePerDay);
const basicPay = MonetaryRules.round(ratePerDay * totalDaysPresent);

// ❌ FORBIDDEN in business code
const holidayPay = Math.round(rawValue * 100) / 100;  // Wrong rule for holiday
const netPay = netPayRaw.toFixed(2);                   // String, not number
const amount = holidayPayRaw * 1;                       // No explicit rounding
```

---

## 11. Validation Strategy

### Layered Validation

```
Layer 1: TypeScript Compile-Time — interfaces/types enforce shape
Layer 2: Zod Runtime (NEW) — every route validates via Zod schemas
Layer 3: Service-Level Guards (NEW) — business invariants in services
Layer 4: Database Constraints — @unique, NOT NULL, foreign keys (existing)
```

### Generic Validation Middleware

```typescript
// shared/middleware/validation.middleware.ts
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/ValidationError';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ValidationError(result.error.errors);
    }
    req[source] = result.data; // Replace with parsed/transformed data
    next();
  };
}
```

### Usage Pattern

```typescript
// Route with inline Zod validation (no controller needed for simple cases)
router.put('/:id', authMiddleware, validate(updatePayrollSchema), async (req, res, next) => {
  // req.body is now fully typed and validated
  const result = await payrollService.updatePayroll(parseInt(req.params.id), req.body);
  return res.json(result);
});
```

---

## 12. Error Handling Strategy

```typescript
// shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// shared/errors/NotFoundError.ts
export class NotFoundError extends AppError {
  constructor(entity: string, id: number | string) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

// ... ValidationError (400), ConflictError (409), UnauthorizedError (401)
```

```typescript
// shared/middleware/error.middleware.ts — maps domain errors to HTTP
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
}
```

---

## 13. Testing Strategy

### Testing Pyramid

```
         ┌─────────┐
         │   E2E   │  ~5-10 tests (critical flows)
         │         │  Framework: supertest
         ├─────────┤
         │ Integr. │  ~20-30 tests (service + test DB)
         │         │  Framework: vitest + test DB
         ├─────────┤
         │  Unit   │  ~50-80 tests (calculators, validators)
         │         │  Framework: vitest
         └─────────┘
```

### Test Categories & Timing

| Category | When to Write | What | Framework |
|----------|--------------|------|-----------|
| **Characterization Tests** | Phase 0A — BEFORE any refactor | Capture current calculation outputs; capture current API response shapes | vitest + supertest |
| **Calculator Unit Tests** | During each Phase A extraction | Given input X, expect output Y | vitest (pure, no setup) |
| **Schema Validation Tests** | During each Phase A extraction | Valid input passes; each invalid field fails correctly | vitest |
| **Service Integration Tests** | After each Phase A extraction | With test DB: service methods produce correct DB state | vitest + test DB |
| **API Snapshot Tests** | After each Phase A extraction | Verify response shape is identical to baseline | vitest + supertest |
| **Bug-Fix Regression Tests** | During each Phase B bug fix | Verify the bug is fixed AND the fix doesn't break anything | vitest |

### Characterization Test Example (Phase 0A)

```typescript
// tests/characterization/payroll.calculator.test.ts
// Captures CURRENT behavior before ANY refactoring
import { describe, it, expect } from 'vitest';
import { calculatePayroll } from '../../src/utils/payrollCalculations';

describe('Payroll Calculator — CHARACTERIZATION (current behavior)', () => {
  // These tests lock in the EXISTING behavior.
  // If a refactor changes any of these, we've introduced a regression.
  
  const STANDARD_INPUT = {
    salary: 35000,
    ratePerDay: 1341.85,
    ratePerHour: 167.73,
    workingDays: 15,
    totalDaysPresent: 13,
    holidays: 1.30,
    overtimeHours: 2,
    lateMinutes: 30,
    mealAllowance: 0,
    silPay: 0,
    birthdayLeave: 0,
    totalIncentives: 500,
    totalDeductions: 800,
  };
  
  it('calculates basic pay as rate × days present', () => {
    const result = calculatePayroll(STANDARD_INPUT);
    expect(result.basicPay).toBe(17444.05);
  });
  
  it('TRUNCATES holiday pay (not rounds)', () => {
    const result = calculatePayroll(STANDARD_INPUT);
    // 1.30 * 1341.85 = 1744.405 → truncated (not rounded)
    expect(result.holidayPay).toBe(1744.40);
  });
  
  it('calculates net pay with truncation', () => {
    const result = calculatePayroll(STANDARD_INPUT);
    // Exact value depends on current implementation
    expect(result.netPay).toBe(18818.59);
  });
});
```

### Calculator Unit Test Example

```typescript
// modules/payroll/calculators/__tests__/payroll.calculator.test.ts
import { PayrollCalculator } from '../payroll.calculator';

describe('PayrollCalculator', () => {
  it('applies Pet Hub truncation to holiday pay', () => {
    const result = PayrollCalculator.calculate({
      ratePerDay: 1341.85,
      ratePerHour: 167.73,
      totalDaysPresent: 13,
      holidays: 1.30,
      overtimeHours: 0,
      lateMinutes: 0,
      mealAllowance: 0,
      silPay: 0,
      birthdayLeave: 0,
      totalIncentives: 0,
      totalDeductions: 0,
    });
    
    // 1.30 × 1341.85 = 1744.405 → TRUNCATED to 1744.40
    expect(result.holidayPay).toBe(1744.40);
    // NOT 1744.41 (which would be rounding)
  });
});
```

---

## 14. Phased Implementation Plan

### Critical Principles

1. **Safety first**: Characterization tests lock in current behavior BEFORE any code moves
2. **Refactoring ≠ Bug fixing**: Separate commits — `refactor()` moves code; `fix()` changes behavior
3. **Never break the build**: Each phase must produce a passing build
4. **Deploy = staging**: After each phase, deploy to staging, verify, then decide on production
5. **One module at a time**: Extract → verify → move to next

### Phase Overview

```
Phase 0A: Baseline & Safety        (2-3 days)  ← NEW
  └── Git branch, DB backup, characterization tests, API snapshots

Phase 0B: Architecture Foundation   (2-3 days)
  └── app.ts/server.ts, error classes, validation middleware, monetary rules

Phase 1A: Payroll Extraction        (2-3 days)  ← HIGHEST PRIORITY
  └── Extract calculator + service + RecalculationService (NO behavior change)

Phase 1B: Payroll Bug Fix           (1 day)
  └── Fix late-deduction double-counting (INTENTIONAL behavior change)

Phase 2A: Incentive Extraction      (2-3 days)
  └── Extract IncentiveService + calculators (NO behavior change)

Phase 3A: Incentive Sheet           (1-2 days)
  └── Extract sheet service + distribution calculator (NO behavior change)

Phase 4A: Deduction Extraction      (1-2 days)
  └── Extract DeductionService, add tx wrapping (NO behavior change)

Phase 5A: Employee Extraction       (2-3 days)
  └── Extract EmployeeService, move deduction sync to DeductionService (NO behavior change)

Phase 6A: Cash Advance Extraction   (1 day)
  └── Extract CashAdvanceService (NO behavior change)

Phase 6B: Cash Advance Bug Fix      (1 day)
  └── Fix mark-paid recalculation (INTENTIONAL behavior change)

Phase 7A: Branch Extraction         (1 day)
  └── Extract BranchService (NO behavior change)

Phase 8A: Auth + Dashboard          (1 day)
  └── Extract remaining services (NO behavior change)

Phase 9: Cleanup & Integration      (2-3 days)
  └── Full regression, dead code removal, documentation, production readiness check

SEPARATE TRACK: Production Hardening
  ├── Prisma migration baseline
  ├── Structured logging
  ├── CI/CD pipeline
  ├── Production deployment procedure
  └── Monitoring setup
```

---

### Phase 0A: Baseline & Safety (2-3 days)

**Goal**: Lock in current behavior so refactoring is safe. NO code changes to business logic.

| # | Task | Details |
|---|------|---------|
| 0A.1 | Create dedicated Git branch | `git checkout -b refactor/modular-monolith` |
| 0A.2 | Tag current working version | `git tag baseline-pre-refactor` |
| 0A.3 | Document current env vars | Copy `.env.example` state; note all env vars used |
| 0A.4 | Back up production database | Via Railway: `pg_dump` or Railway backup |
| 0A.5 | Capture API contracts | Run all endpoints; save response JSONs as snapshots |
| 0A.6 | Capture representative payroll records | Record payroll IDs with known good calculations |
| 0A.7 | **Write characterization tests for PayrollCalculator** | Lock in `calculatePayroll()` current behavior — every input/output pair |
| 0A.8 | **Write characterization tests for RateCalculator** | Lock in `calculateMonthlyRates()`, `calculateAnnualRates()` |
| 0A.9 | **Write characterization tests for IncentiveCalculator** | Lock in `calculateIncentive()`, `calculateBulkIncentives()` |
| 0A.10 | **Write API smoke tests** | Login, create payroll, calculate, verify basic flow |
| 0A.11 | Verify current production behavior | Run smoke tests against production |

**Verification**: All characterization tests pass against current code. Any future refactor that changes these results is a regression.

---

### Phase 0B: Architecture Foundation (2-3 days)

**Goal**: Set up shared infrastructure. NO business logic changes.

| # | Task | Details | Files Created |
|---|------|---------|---------------|
| 0B.1 | Install Zod on backend | `npm install zod` | `package.json` |
| 0B.2 | Create `shared/` directory structure | Folders for errors, middleware, types, utils, database | Directory structure |
| 0B.3 | Create error classes | `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError` | `shared/errors/*.ts` |
| 0B.4 | Create `MonetaryRules` utility | `round()`, `truncate()`, `fromDecimal()`, `format()` | `shared/utils/monetary.utils.ts` |
| 0B.5 | Create validation middleware | Generic `validate(schema, source)` middleware factory | `shared/middleware/validation.middleware.ts` |
| 0B.6 | Create global error middleware | Maps domain errors → HTTP; handles ZodError | `shared/middleware/error.middleware.ts` |
| 0B.7 | Move `auth.middleware.ts` to shared | Copy to `shared/middleware/`; old file still exists as reference | `shared/middleware/auth.middleware.ts` |
| 0B.8 | Move `prisma.ts` to shared | Copy to `shared/database/`; old file still exists | `shared/database/prisma.ts` |
| 0B.9 | Split `app.ts` from `server.ts` | `app.ts` creates Express + middleware + routes; `server.ts` imports app + listens | `src/app.ts`, `src/server.ts` |
| 0B.10 | Verify full system still works | `npm run dev`; all pages load; login works; payroll displays | — |
| 0B.11 | Run characterization tests | All must still pass against current code | — |

**Verification**: System runs identically. All characterization tests pass. No behavior changed.

---

### Phase 1A: Payroll Extraction (2-3 days)

**Goal**: Move payroll code WITHOUT changing behavior. Centralize recalculation.

**Commit style**: `refactor(payroll): ...`

| # | Task | Details |
|---|------|---------|
| 1A.1 | Create `modules/payroll/` directory | With `calculators/` subdirectory |
| 1A.2 | Create `payroll.calculator.ts` | Move `calculatePayroll()` into `PayrollCalculator` class. Replace bare `Math.round`/`Math.floor` with `MonetaryRules` calls. |
| 1A.3 | Write unit tests for PayrollCalculator | Verify identical output to characterization tests |
| 1A.4 | Create `rate.calculator.ts` | Move `calculateMonthlyRates()`, `calculateAnnualRates()`, `calculateEmployeeRates()` into `RateCalculator` |
| 1A.5 | Write unit tests for RateCalculator | Verify identical output to characterization tests |
| 1A.6 | Create `recalculation.service.ts` | **CRITICAL**: Create ONE `RecalculationService.recalculate(payrollId, tx?)` that all modules will use. Accepts optional `tx` for transaction propagation. |
| 1A.7 | Create `payroll.schema.ts` | Zod schemas: `createPeriodSchema`, `updatePayrollSchema` |
| 1A.8 | Create `payroll.service.ts` | `createPeriod()`, `updatePayroll()`, `calculate()`, `delete()`, `getAll()`, `getById()`. Uses `PayrollCalculator`, `RecalculationService`. Accepts optional `tx`. |
| 1A.9 | Write service integration tests | With test DB, verify service produces correct DB state |
| 1A.10 | Rewrite `payroll.routes.ts` | Thin routes: validate → call service → respond. Register from new location. |
| 1A.11 | **Update callers of recalculation** | Replace inline recalculation in `incentive.routes.ts`, `deduction.routes.ts`, `incentive-sheet.routes.ts`, `employee.routes.ts` with `RecalculationService.recalculate()`. These still call from old route locations — but now call ONE centralized function. |
| 1A.12 | Run all characterization + unit + integration tests | All must pass. API snapshots must match. |

**Verification**: `RecalculationService.recalculate()` is the ONLY function that updates payroll totals. All 5 former implementations are deleted. All tests pass identically to baseline. No bug fixes in this phase.

---

### Phase 1B: Payroll Bug Fix (1 day)

**Goal**: Fix the late-deduction double-counting bug. INTENTIONAL behavior change.

**Commit style**: `fix(payroll): ...`

| # | Task | Details |
|---|------|---------|
| 1B.1 | Write failing test for correct behavior | Test confirms `totalDeductions` stores ONLY sum of deduction line items (not late deduction) |
| 1B.2 | Fix `PayrollCalculator` | Ensure `lateDeduction` is subtracted from gross pay in `netPay` formula but NOT included in `totalDeductions` field |
| 1B.3 | Fix `RecalculationService` | Same correction in centralized recalculation |
| 1B.4 | Fix `PayrollService.updatePayroll()` | Same correction |
| 1B.5 | Update characterization tests | New expected values for `totalDeductions` and `netPay` where late deductions exist |
| 1B.6 | Verify with manual payroll data | Compare against known-good Excel calculations |
| 1B.7 | Update any affected test fixtures | Snapshot tests may need updating for corrected values |

**Verification**: `totalDeductions` = sum of actual deduction records only. `netPay` = `grossPay - totalDeductions - lateDeduction`. Bug-fix regression test passes.

---

### Phase 2A: Incentive Extraction (2-3 days)

**Commit style**: `refactor(incentives): ...`

| # | Task |
|---|------|
| 2A.1 | Create `modules/incentives/` directory with `calculators/` |
| 2A.2 | Create `incentive.calculator.ts` — move `calculateIncentive()`, `calculateBulkIncentives()` |
| 2A.3 | Create `incentive-config.service.ts` — move `DEFAULT_INCENTIVE_CONFIG`, `getIncentiveTypesForPosition()`, `isSharedIncentiveType()`, etc. |
| 2A.4 | Write unit tests for incentive calculator |
| 2A.5 | Create `incentive.schema.ts` |
| 2A.6 | Create `incentive.service.ts` — config CRUD, individual incentive CRUD, bulk update, calculate preview. Uses `RecalculationService.recalculate()` with `tx` parameter. |
| 2A.7 | Rewrite `incentive.routes.ts` |
| 2A.8 | Fix config alignment — ensure incentive-sheet distribution config matches individual config where types overlap (or document the deliberate difference) |
| 2A.9 | Write integration tests |
| 2A.10 | Run all tests |

### Phase 3A: Incentive Sheet Extraction (1-2 days)

**Commit style**: `refactor(incentive-sheets): ...`

| # | Task |
|---|------|
| 3A.1 | Create `modules/incentive-sheets/` directory |
| 3A.2 | Extract `incentive-sheet.config.ts` — `DISTRIBUTION_CONFIG`, `SHARED_TYPES` |
| 3A.3 | Create `distribution.calculator.ts` — move `calculateDistributions()`, `calculateDistributionPreview()` |
| 3A.4 | Create `incentive-sheet.controller.ts` — complex request parsing (query params, date ranges) — this is one module that benefits from a controller |
| 3A.5 | Create `incentive-sheet.service.ts` — sheet CRUD, input upsert, distribute (with $transaction wrapping calls to IncentiveService and RecalculationService, passing tx) |
| 3A.6 | Rewrite `incentive-sheet.routes.ts` |
| 3A.7 | Write tests |

### Phase 4A: Deduction Extraction (1-2 days)

| # | Task |
|---|------|
| 4A.1 | Create `modules/deductions/` directory |
| 4A.2 | Create `deduction.service.ts` — CRUD, bulk, apply-fixed, divisor. Uses `RecalculationService.recalculate()` with `tx`. |
| 4A.3 | Rewrite `deduction.routes.ts` |
| 4A.4 | Add `$transaction` for `applyFixed` (deletes + creates multiple records) |
| 4A.5 | Write tests |

### Phase 5A: Employee Extraction (2-3 days)

| # | Task |
|---|------|
| 5A.1 | Create `modules/employees/` directory |
| 5A.2 | Create `employee.service.ts` — CRUD, rate calculation via `RateCalculator`, fixed-deduction management delegates to `DeductionService`, incentive exclusions, formula info |
| 5A.3 | **Extract deduction sync to DeductionService** — move the 107-line deduction sync from `employee.routes.ts` into `DeductionService.syncEmployeeDeductions()`. This method accepts `tx`. |
| 5A.4 | Rewrite `employee.routes.ts` — from 618 lines to ~50 lines |
| 5A.5 | Write tests |

### Phase 6A: Cash Advance Extraction (1 day)

| # | Task |
|---|------|
| 6A.1 | Create `modules/cash-advances/` directory |
| 6A.2 | Create `cashAdvance.service.ts` — CRUD, mark-paid, getUnpaid |
| 6A.3 | Rewrite `cashAdvance.routes.ts` |
| 6A.4 | Write tests |

### Phase 6B: Cash Advance Bug Fix (1 day)

**Commit style**: `fix(cash-advance): ...`

| # | Task |
|---|------|
| 6B.1 | Write failing test: mark-paid with payrollId should fully recalculate payroll |
| 6B.2 | Fix `CashAdvanceService.markPaid()` to call `RecalculationService.recalculate()` instead of manually updating `totalDeductions` |
| 6B.3 | Wrap mark-paid + deduction creation + recalculation in `$transaction` |
| 6B.4 | Update any affected test fixtures |

### Phase 7A: Branch Extraction (1 day)

| # | Task |
|---|------|
| 7A.1 | Create `modules/branches/` directory |
| 7A.2 | Create `branch.service.ts` — CRUD, rate recalculation on D/H change |
| 7A.3 | Rewrite `branch.routes.ts` |

### Phase 8A: Auth + Dashboard (1 day)

| # | Task |
|---|------|
| 8A.1 | Create `modules/auth/` — light refactor (auth is already fairly clean) |
| 8A.2 | Create `modules/dashboard/` — extract dashboard queries |
| 8A.3 | Fix `totalEmployees` vs `activeEmployees` dashboard bug (INTENTIONAL behavior change — note as `fix` commit) |

### Phase 9: Cleanup & Integration (2-3 days)

| # | Task |
|---|------|
| 9.1 | Full regression test suite |
| 9.2 | Update `seed.ts` — uses direct Prisma (NOT services) |
| 9.3 | Remove dead code: `middleware/rateLimiter.ts`, empty directories, unused helpers |
| 9.4 | Remove deprecated old route files (only after ALL tests pass against new routes) |
| 9.5 | Update `SYSTEM_INDEX.md` to reflect new architecture |
| 9.6 | Verify production build: `npm run build` on both services |
| 9.7 | **Deploy to staging** — smoke test on Railway staging environment |
| 9.8 | **Manual payroll verification** — compare staging calculations against known-good records |
| 9.9 | **Production release decision** — explicit go/no-go gate |
| 9.10 | Git tag: `git tag refactor-modular-monolith-v1`

---

### SEPARATE TRACK: Production Hardening

This runs in **parallel**, not blocking the refactor. It does not depend on code reorganization.

| # | Task | Details |
|---|------|---------|
| H.1 | Inspect production schema | Compare production DB ↔ `schema.prisma` — identify any drift |
| H.2 | Back up production database (again) | Before any migration work |
| H.3 | Establish migration baseline | `prisma migrate diff` from empty to current schema; review the SQL |
| H.4 | Create initial migration | `prisma migrate dev --name initial_baseline` on a cloned/staging DB |
| H.5 | Test migration workflow on staging | Apply → verify → rollback → verify |
| H.6 | Document migration deployment procedure | Step-by-step for Railway production |
| H.7 | Structured logging | Replace `console.error` with winston/pino |
| H.8 | CI/CD pipeline | GitHub Actions: lint → typecheck → test → build |
| H.9 | Production monitoring | Railway health checks + error alerting |

---

### Phase Timeline Summary

```
Week 1: Phase 0A (Baseline) + Phase 0B (Foundation)
Week 2: Phase 1A (Payroll extraction) + Phase 1B (Payroll bug fix)
Week 3: Phase 2A (Incentives) + Phase 3A (Incentive Sheets)
Week 4: Phase 4A (Deductions) + Phase 5A (Employees)
Week 5: Phase 6A (Cash Advance extraction) + Phase 6B (Cash Advance fix) + Phase 7A (Branches)
Week 6: Phase 8A (Auth/Dashboard) + Phase 9 (Cleanup) + Staging deployment
─────────────────────────────────────────────────────────────────────────────
Total: ~6 weeks (30 working days) for complete refactor + staging verification
Production Hardening: runs in parallel, does not block refactor

GATE: After Week 6 → Production release decision (not automatic)
```

---

## 15. Dependency & Call Flow Design

### Service Dependency Graph

```
AuthService ←── called by middleware (all routes)
     │
     ├── BranchService
     │       └── RateCalculator
     │
     ├── EmployeeService
     │       ├── RateCalculator
     │       └── DeductionService (for fixed deduction sync)
     │
     ├── PayrollService
     │       ├── PayrollCalculator
     │       └── RecalculationService
     │
     ├── IncentiveService
     │       ├── IncentiveCalculator
     │       ├── IncentiveConfigService
     │       └── RecalculationService
     │
     ├── IncentiveSheetService
     │       ├── DistributionCalculator
     │       ├── IncentiveService (upsert, with tx)
     │       └── RecalculationService (with tx)
     │
     ├── DeductionService
     │       └── RecalculationService
     │
     ├── CashAdvanceService
     │       └── RecalculationService
     │
     └── DashboardService
```

### Transaction Propagation Pattern

```
IncentiveSheetService.distribute(sheetId)
  │
  └── prisma.$transaction(async (tx) => {
        │
        ├── incentiveService.upsertIncentive(payrollId, type, amount, formula, tx)
        │     └── const db = tx || prisma
        │         db.incentive.upsert(...)
        │
        ├── recalculationService.recalculate(payrollId, tx)
        │     └── const db = tx || prisma
        │         db.payrollPeriod.update(...)
        │
        └── tx.incentiveSheet.update({ data: { isDistributed: true } })
      })
```

---

## 16. Risk Assessment & Mitigation

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | **Regression from refactor** | Medium | High | Characterization tests lock in current behavior BEFORE any code moves |
| 2 | **Bug fix accidentally mixed with refactor** | Medium | High | Separate Phase A (extract) from Phase B (fix); different commit prefixes |
| 3 | **Transaction propagation broken** | Medium | High | Every service accepts optional `tx`; integration tests verify atomicity |
| 4 | **Monetary precision lost** | Low | Critical | `MonetaryRules` class enforces boundary rules; all calculator tests verify precision |
| 5 | **Frontend breaks from response change** | Medium | High | API snapshot tests verify identical response shape |
| 6 | **Migration baseline on live DB fails** | Medium | High | Migration work is a SEPARATE track on cloned/staging DB, not mixed into refactor |
| 7 | **Over-engineering with unnecessary abstractions** | Low | Medium | Controllers are optional; no repository layer; skip pure-architecture patterns |
| 8 | **Deploying refactored code directly to production** | Medium | High | Deploy to staging after each phase; production release is gated, not automatic |

---

## 17. Success Criteria

### Must-Have (Blocking for Production Release)

| # | Criterion | Measurement |
|---|-----------|-------------|
| 1 | All characterization tests pass against refactored code | Identical output for all calculator inputs |
| 2 | Frontend works without any changes | All pages load, all CRUD operations function |
| 3 | `RecalculationService.recalculate()` is the ONLY function that updates payroll totals | `grep -r "Math.round.*basicPay\|calculatePayroll\|recalculate" modules/` finds only the service |
| 4 | No duplicated recalculation code | Old 5 copies deleted |
| 5 | Calculator functions have unit tests | `PayrollCalculator`, `RateCalculator`, `IncentiveCalculator`, `DistributionCalculator` |
| 6 | Every route validates input | All routes use Zod schemas (no raw `req.body` destructuring) |
| 7 | Multi-step writes use `$transaction` | Operations in the Transaction Strategy table use `prisma.$transaction()` |
| 8 | All services accept optional `tx` parameter | `TxClient` type used consistently |
| 9 | All monetary operations use `MonetaryRules` | No bare `Math.round()`/`Math.floor()` in business code |
| 10 | Late-deduction bug fixed | Regression test confirms correct `totalDeductions` and `netPay` |
| 11 | Mark-paid does full recalculation | Integration test confirms net pay recalculated after mark-paid |
| 12 | Staging deployment smoke-tested | Manual payroll verification against known-good records |
| 13 | Production release has explicit go/no-go | Gate checklist completed before `git tag` |

### Should-Have

| # | Criterion |
|---|-----------|
| 14 | Route files under 100 lines each |
| 15 | Deduction sync moved from employee route to DeductionService |
| 16 | Incentive configs aligned between individual and sheet systems |
| 17 | Dashboard `totalEmployees` metric fixed |
| 18 | Dead code removed (`rateLimiter.ts`, empty directories) |

### Nice-to-Have

| # | Criterion |
|---|-----------|
| 19 | Prisma migration baseline established (Hardening track) |
| 20 | CI/CD pipeline with tests on PR (Hardening track) |
| 21 | Structured logging replaced `console.error` (Hardening track) |
| 22 | E2E smoke tests for 3-5 critical flows |

---

## 18. Phase-by-Phase File Map

### Phase 0A: Files Created

```
backend/
├── tests/
│   └── characterization/
│       ├── payroll.calculator.test.ts      # NEW — locks in current calculatePayroll()
│       ├── rate.calculator.test.ts         # NEW — locks in current rate functions
│       ├── incentive.calculator.test.ts    # NEW — locks in current incentive functions
│       └── api/
│           ├── auth.smoke.test.ts          # NEW — login flow
│           └── payroll.smoke.test.ts       # NEW — create/calculate flow
└── snapshots/
    └── api-responses/                      # NEW — JSON snapshots of current responses
```

### Phase 0B: Files Created

```
backend/src/
├── app.ts                                  # NEW
├── server.ts                               # NEW
└── shared/
    ├── errors/
    │   ├── AppError.ts                     # NEW
    │   ├── NotFoundError.ts                # NEW
    │   ├── ValidationError.ts              # NEW
    │   ├── ConflictError.ts                # NEW
    │   └── UnauthorizedError.ts            # NEW
    ├── middleware/
    │   ├── auth.middleware.ts              # MOVED (copy from src/middleware/)
    │   ├── error.middleware.ts             # NEW
    │   └── validation.middleware.ts        # NEW
    ├── database/
    │   └── prisma.ts                       # MOVED (copy from src/utils/)
    ├── types/
    │   └── common.types.ts                 # NEW — TxClient type, DTOs
    └── utils/
        └── monetary.utils.ts               # NEW — MonetaryRules class
```

### Phase 1A: Files Created

```
backend/src/modules/payroll/
├── payroll.routes.ts                       # NEW (replaces src/routes/payroll.routes.ts)
├── payroll.service.ts                      # NEW
├── payroll.schema.ts                       # NEW
├── calculators/
│   ├── payroll.calculator.ts               # NEW (extracted from utils/payrollCalculations.ts)
│   ├── payroll.calculator.test.ts          # NEW — unit tests
│   ├── rate.calculator.ts                  # NEW (extracted from utils/payrollCalculations.ts)
│   ├── rate.calculator.test.ts             # NEW — unit tests
│   └── recalculation.service.ts            # NEW — CENTRALIZED (tx param)
└── __tests__/
    └── payroll.service.test.ts             # NEW — integration tests
```

### Files Deprecated (deleted in Phase 9, not before)

```
backend/src/routes/payroll.routes.ts        # DEPRECATED
backend/src/utils/payrollCalculations.ts     # DEPRECATED (logic extracted)
```

### Phase 2A-8A: Pattern Repeated

Each module follows:
```
modules/<domain>/
├── <domain>.routes.ts
├── <domain>.service.ts                     # Accepts optional tx
├── <domain>.schema.ts                      # Zod schemas
├── <domain>.controller.ts                  # ONLY if complex parsing needed
├── calculators/                            # If applicable
│   └── *.calculator.ts + *.test.ts
└── __tests__/
    └── <domain>.service.test.ts
```

### Phase 9: Files Removed

```
backend/src/middleware/rateLimiter.ts        # REMOVE (dead code)
backend/src/routes/*.routes.ts              # REMOVE (all old route files)
backend/src/utils/payrollCalculations.ts     # REMOVE (extracted)
frontend/src/components/payroll/            # REMOVE (empty)
frontend/src/components/payslip/            # REMOVE (empty)
frontend/src/components/ui/                 # REMOVE (empty)
frontend/src/hooks/                         # REMOVE (empty)
```

---

## Appendix A: Commit Convention

Every commit in this refactor follows strict prefixes:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `refactor(module):` | Moving code, NO behavior change | `refactor(payroll): extract PayrollCalculator from route` |
| `fix(module):` | Intentional behavior correction | `fix(payroll): correct late deduction double-counting in totalDeductions` |
| `test(module):` | Adding tests only | `test(payroll): add characterization tests for calculator` |
| `feat(module):` | New capability (e.g., validation) | `feat(payroll): add Zod validation to update endpoint` |
| `chore:` | Infrastructure, config, tooling | `chore: add vitest configuration` |

### Example Commit Sequence for Phase 1

```
test(payroll): add characterization tests for calculatePayroll
test(payroll): add characterization tests for rate calculations
refactor(payroll): extract PayrollCalculator class from route
refactor(payroll): extract RateCalculator class from route
refactor(payroll): extract RecalculationService — centralized recalculation
refactor(payroll): extract PayrollService with tx propagation
refactor(payroll): rewrite payroll routes to use PayrollService
refactor(payroll): update all callers to use RecalculationService
test(payroll): add unit tests for PayrollCalculator
test(payroll): add integration tests for PayrollService
fix(payroll): correct late deduction double-counting in totalDeductions
test(payroll): add regression test for late deduction fix
```

---

## Appendix B: Known Bugs — When They Get Fixed

| Bug | Fix Phase | Commit Prefix |
|-----|----------|--------------|
| Late deduction double-counted | Phase 1B | `fix(payroll):` |
| Mark-paid incomplete recalculation | Phase 6B | `fix(cash-advance):` |
| Dashboard totalEmployees === activeEmployees | Phase 8A | `fix(dashboard):` |
| Incentive config alignment | Phase 2A | `refactor(incentives):` then `fix(incentives):` |

---

## Appendix C: Review Checklist Before Each Phase

```
[ ] Characterization tests still pass against current code
[ ] Git diff reviewed — no unintended changes
[ ] Old code still functional (parallel new + old until Phase 9)
[ ] New service accepts optional tx parameter
[ ] Monetary operations use MonetaryRules, not bare Math
[ ] Routes delegate to service, not Prisma
[ ] API response shape matches snapshot
[ ] Zod schemas tested (valid + invalid cases)
[ ] npm run build succeeds
[ ] npm run dev starts without errors
[ ] Staging deployment smoke-tested (Phase 9+)
```

---

*This architecture refactoring plan (v2.0) incorporates review feedback adding: baseline safety phase, separation of refactoring from bug fixes, transaction client propagation design, explicit monetary handling rules, optional controller pattern, direct Prisma for seed data, staging-before-production deployment gates, and a separate production hardening track.*
