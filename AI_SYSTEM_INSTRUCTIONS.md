# 🤖 AI_SYSTEM_INSTRUCTIONS.md — Anti-Hallucination & Architecture Context

> **ATTENTION AI ASSISTANT / AGENT:**  
> Basahin nang buo ang file na ito bago magsulat o mag-modify ng code. Ang proyektong ito ay may striktong arkitektura at domain rules. Huwag mag-assume o mag-hallucinate ng bagong pattern nang hindi sumusunod sa mga panuntunan sa ibaba.

---

## 1. Project Overview & Architecture Style

Ang **Pet Hub Payroll System** ay isang enterprise-grade, **Modular Monolith** application.

* **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
* **Frontend**: React (Vite), TypeScript, Tailwind CSS, Shadcn UI (`lucide-react`, `@radix-ui/*`).
* **Architecture Pattern**:
  * **Module-Based Directory Structure** sa Backend:
    * `backend/src/modules/<module-name>/`
      * `<module>.routes.ts` (Routing & middleware guards)
      * `<module>.service.ts` (Business logic)
      * `<module>.schema.ts` (Zod validation schemas kung applicable)
      * `calculators/` (Pure math/business calculations hiwalay sa DB logic)
  * **Shared Resources**:
    * `backend/src/shared/database/prisma.ts` (Singleton Prisma client)
    * `backend/src/shared/errors/` (`AppError`, `NotFoundError`, `ConflictError`, `ValidationError`)
    * `backend/src/shared/middleware/` (`auth.middleware.ts`, `error.middleware.ts`, `validation.middleware.ts`)
    * `backend/src/shared/utils/` (`logger.ts` winston, `monetary.utils.ts`)

---

## 2. STRICT RULES FOR AI (Zero Hallucination Policy)

### Rule #1: Modular Monolith Boundary (Bawal Ibenta ang Lumang Pattern)
* **HUWAG** maglagay ng bagong routes sa lumang `backend/src/routes/` folder. Lahat ng bagong endpoints o feature refactors ay DAPAT nasa ilalim ng `backend/src/modules/<module-name>/`.
* I-import ang module routers sa `backend/src/app.ts`.

### Rule #2: Error Handling & Logging
* **HUWAG** mag-throw ng generic `new Error('message')` sa services. Gumamit ng custom error classes:
  * `throw new NotFoundError('...')`
  * `throw new ConflictError('...')`
  * `throw new ValidationError('...')`
  * `throw new AppError('...', statusCode)`
* Lahat ng unexpected errors ay dadaan sa centralized `error.middleware.ts`.
* Gamitin ang Winston logger mula sa `shared/utils/logger.ts`, hindi puro unformatted `console.log`.

### Rule #3: Financial & Payroll Calculation Rules
* **Monetary Precision**: Lahat ng sentimo ay mahalaga. Gamitin ang rounding helpers sa `shared/utils/monetary.utils.ts` upang maiwasan ang floating-point errors (`0.1 + 0.2 !== 0.3`).
* **Payroll Locking**: Kapag ang payroll period ay nasa `LOCKED` o `FINALIZED` status:
  * **STRICTLY IMMUTABLE**: Bawal baguhin ang mga deductions, gross pay, o net pay maliban na lang kung may explicit unlock flow na may auditing.
* **Pure Calculators**: Ang business formulas (PhilHealth, SSS, Pag-IBIG, Withholding Tax, Cash Advance deductions, Daily rate calculation) ay DAPAT nasa pure functions (`calculators/`) na may automated unit tests, HINDI nakabaon sa gitna ng database queries.

### Rule #4: Frontend Component Architecture (Shadcn + Tailwind)
* Gumamit ng reusable components mula sa `frontend/src/components/ui/` (Button, Input, Card, Dialog, Select, Sonner, Table, Tabs, etc.).
* Para sa path imports sa frontend, gamitin ang alias na `@/...` na nakaturo sa `frontend/src/`.
* Huwag mag-install ng magkakasalungat na UI library (hal. huwag magdagdag ng Chakra UI, Ant Design, o MUI). Manatili sa Tailwind + Shadcn/Radix UI.
* Gamitin ang `sonner` para sa toast notifications: `toast.success()`, `toast.error()`.

### Rule #5: Database & Prisma Migration Discipline
* Huwag mag-execute ng direct SQL commands na sumisira sa migration history.
* Laging gamitin ang `npx prisma migrate dev` para sa pagbabago sa schema.
* Tiyakin na ang foreign keys at cascading deletes ay may maingat na impact checks bago i-apply (hal. deactivating a branch vs deleting records with payroll history).

---

## 3. Directory Map Reference

```text
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema definitions
│   ├── src/
│   │   ├── app.ts                 # Express app configuration & module mounting
│   │   ├── server.ts              # Server bootstrap / listener
│   │   ├── modules/               # Domain modules (branches, payroll, employees, etc.)
│   │   └── shared/                # Cross-cutting concerns (db, errors, middleware, utils)
│   └── tests/                     # Vitest test suite (unit, integration, characterization)
├── frontend/
│   ├── src/
│   │   ├── components/            # Domain components & ui/ (Shadcn)
│   │   ├── pages/                 # Route page components
│   │   ├── hooks/                 # Custom React hooks
│   │   └── utils/api.ts           # Centralized Axios / Fetch client
├── report/                        # Architectural documentation & proposals
├── SYSTEM_INDEX.md                # Comprehensive system map and feature matrix
└── SETUP_NEW_DEVICE.md            # Onboarding guide for new environments
```

Kapag magpapatupad ng bagong feature:
1. Suriin muna ang `SYSTEM_INDEX.md` para sa existing business logic.
2. Sundin ang modular structure.
3. Magdagdag ng unit tests sa `backend/tests/` para sa bagong calculator/service logic.
