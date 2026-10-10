# Branches Module — UI/UX Workflow Report

> **Generated**: 2026-07-25
> **Branch**: `refactor/modular-monolith`
> **Purpose**: Full documentation of the Branches module user interface, user experience workflows, API surface, and access control model.

---

## 1. Overview

The Branches module manages Pet Hub's 8+ branch locations. It spans two frontend pages (`Branches.tsx`, `BranchDetails.tsx`), the incentive sheet system, and several cross-module integrations (Dashboard, Payroll, Employees).

**Backend**: `backend/src/modules/branches/` — routes, service, validation schemas  
**Frontend pages**: `frontend/src/pages/Branches.tsx`, `frontend/src/pages/BranchDetails.tsx`  
**Related**: `frontend/src/pages/IncentiveSheetPage.tsx`, `frontend/src/components/payroll/BranchIncentiveDrawer.tsx`

---

## 2. User Flow Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD  (/dashboard)                         │
│  ┌──────────────────────┐       ┌──────────────────────────────────┐    │
│  │ "Total Branches"     │──────>│  /branches                       │    │
│  │ stat card            │       │  (Branch list page)              │    │
│  └──────────────────────┘       └─────────┬────────────────────────┘    │
│  ┌──────────────────────┐                 │                              │
│  │ Branch summary items │────────────────┘                              │
│  │ (per-branch link)    │                                               │
│  └──────────────────────┘                                               │
│     also: /branches/:id (detail page)                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    BRANCHES PAGE  (/branches)                            │
│                                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐              │
│  │ Branch  │  │ Branch  │  │ Branch  │  │ + Add Branch │ button        │
│  │ Card 1  │  │ Card 2  │  │ Card 3  │  └──────┬───────┘              │
│  │         │  │         │  │         │         │                        │
│  │ [Edit]  │  │ [Edit]  │  │ [Edit]  │    ┌────┴────┐                  │
│  │[Delete] │  │[Delete] │  │[Delete] │    │ CREATE  │ modal            │
│  └────┬────┘  └─────────┘  └─────────┘    │ MODAL   │                  │
│       │                                    │         │                  │
│  ┌────┴────┐                               │ name    │                  │
│  │  EDIT   │ modal (pre-filled)            │ address │                  │
│  │  MODAL  │                               │ contact │                  │
│  │         │                               │ type    │                  │
│  │ (same fields as create)                 │ D / H   │                  │
│  └─────────┘                               └─────────┘                  │
│                                                                         │
│  Card click ──────────────────────────────────────────────────────┐     │
│  (name area)                                                       │     │
└────────────────────────────────────────────────────────────────────┼─────┘
                                                                     │
┌────────────────────────────────────────────────────────────────────┼─────┐
│              BRANCH DETAILS PAGE  (/branches/:id)                  │     │
│                                                                   │     │
│  ┌──────────────────────────────────────────────────────┐         │     │
│  │ < Back to Branches    [Reactivate] (if inactive)     │         │     │
│  ├──────────┬───────────────────┬───────────────────────┤         │     │
│  │ OVERVIEW │    EMPLOYEES      │  PAYROLL SETTINGS     │         │     │
│  │  tab     │     tab           │   tab                 │         │     │
│  ├──────────┴───────────────────┴───────────────────────┤         │     │
│  │                                                       │         │     │
│  │  Branch Info:                                         │         │     │
│  │    · Address, Contact, Type, Status                   │         │     │
│  │    · Working Days: 22  |  Working Hours: 8            │         │     │
│  │    · Employee Count: 12  |  Rate Formula: MONTHLY     │         │     │
│  │                                                       │         │     │
│  │  ┌──────────────────────────┐  ┌────────────────────┐ │         │     │
│  │  │ [Deactivate Branch]      │  │ [Change Payroll     │ │         │     │
│  │  └──────────────────────────┘  │  Settings]          │ │         │     │
│  │                                └─────────┬──────────┘ │         │     │
│  └───────────────────────────────────────────┼───────────┘         │     │
│                                              │                      │     │
│     ┌───────────────────────┐    ┌───────────┴───────────────┐     │     │
│     │ DEACTIVATE DIALOG     │    │ PAYROLL SETTINGS DIALOG   │     │     │
│     │                       │    │                           │     │     │
│     │ "This will deactivate │    │ Working Days: [22] ▲▼     │     │     │
│     │  this branch.         │    │ Working Hours: [8]  ▲▼    │     │     │
│     │  Employees: 12"       │    │                           │     │     │
│     │                       │    │ ── IMPACT PREVIEW ──      │     │     │
│     │ [Deactivate] (DISABLED│    │ Employee | Old Rate | New │     │     │
│     │  if employees > 0)    │    │ Juan D.  | 2,045.45|2,250 │     │     │
│     │                       │    │ Maria C. | 1,341.85|1,476 │     │     │
│     │ [Cancel]              │    │ ...                       │     │     │
│     └───────────────────────┘    │                           │     │     │
│                                  │ ☐ I understand...         │     │     │
│                                  │ [Save Changes] (disabled  │     │     │
│                                  │  until checked)           │     │     │
│                                  └───────────────────────────┘     │     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     PAYROLL PAGE  (/payroll)                             │
│                                                                         │
│  ┌─────────────────────────────────┐                                    │
│  │ PeriodHeader                    │                                    │
│  │   [Branch filter dropdown]  [+] │──> selects branch, filters payroll │
│  └─────────────────────────────────┘                                    │
│                                                                         │
│  Per period row:                                                        │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ [Branch Incentive Sheet] button                               │       │
│  └──────────────┬───────────────────────────────────────────────┘       │
│                 │                                                        │
│                 v                                                        │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ INCENTIVE SHEET PAGE  (/payroll/incentive-sheet/:periodId)    │       │
│  │ (full-screen, no sidebar)                                     │       │
│  │                                                                │       │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐        │       │
│  │  │ DAILY INPUT GRID │  │ DISTRIBUTION PREVIEW (tab)   │        │       │
│  │  │                  │  │                              │        │       │
│  │  │ Type  | D1| D2.. │  │ Grooming: 3 employees       │        │       │
│  │  │ Groom | 5 | 3 .. │  │ Surgery:  2 employees       │        │       │
│  │  │ Surge | 2 | 1 .. │  │ Emergency: 4 employees      │        │       │
│  │  │ Emerg | 0 | 2 .. │  │ Confine:   5 employees      │        │       │
│  │  │ Conf  | 4 | 6 .. │  │ Total: ₱15,250.00           │        │       │
│  │  ├──────────────────┤  │                              │        │       │
│  │  │ TOTALS row       │  │                              │        │       │
│  │  └──────────────────┘  └──────────────────────────────┘        │       │
│  │                                                                │       │
│  │  [Save]  [Save & Distribute]  [Cancel / Back]                  │       │
│  └────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                 EMPLOYEES PAGE  (/employees?branchId=X)                  │
│                                                                         │
│  · Branch dropdown filter uses branch list                              │
│  · Branch workingDaysPerMonth / workingHoursPerDay used for             │
│    rate calculation formula display                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Page-by-Page Breakdown

### 3.1 Branches Page (`/branches`)

**File**: `frontend/src/pages/Branches.tsx` (341 lines)

**Renders**:
- Page header: "Branches | Manage Pet Hub branch locations"
- Card grid (responsive: 1/2/3 columns) showing all branches
- Each card displays: name, type badge (Clinic/Hospital/Trading), address, contact, working days/month, working hours/day, employee count, active/inactive status
- "+ Add Branch" button (top-right)
- Create/Edit modal (conditionally rendered)

**User Interactions**:

| Interaction | Trigger | Result |
|---|---|---|
| View branches | Page load | `GET /api/branches` fetches all branches |
| Add branch | "+ Add Branch" button | Opens create modal with empty form |
| Edit branch | Pencil icon (card hover) | Opens modal pre-filled with branch data |
| Delete branch | Trash icon (card hover) | `window.confirm`, then `DELETE /api/branches/:id` |
| Submit create | "Add Branch" button | `POST /api/branches` with form data |
| Submit edit | "Save Changes" button | `PUT /api/branches/:id` with form data |
| Close modal | Cancel / backdrop click | Resets form state, closes modal |
| View details | Click branch card name | Navigates to `/branches/:id` |

**Create/Edit Modal Fields**:
1. Branch Name (text, required)
2. Address (textarea, required)
3. Contact Number (text, optional)
4. Branch Type (select: Veterinary Clinic, Veterinary Hospital, Trading)
5. Working Days/Month — D (number, 1-31, default 22)
6. Working Hours/Day — H (number, 1-24, default 8)

**Edit Warning**: "Changing these values will recalculate rates for all employees in this branch."

**State**: `isModalOpen`, `editingBranch`, `formData` (name/address/contact/type/D/H)

**API calls used**: `branchApi.getAll()`, `branchApi.create()`, `branchApi.update()`, `branchApi.delete()`

**Access Control**: Edit/Delete buttons visible to all users. Backend rejects non-ADMIN with 403.

---

### 3.2 Branch Details Page (`/branches/:id`)

**File**: `frontend/src/pages/BranchDetails.tsx` (276 lines)

**Renders**:
- "Back to Branches" navigation link
- Deactivation banner (amber) when branch is inactive
- Three-tab layout: Overview, Employees, Payroll Settings
- Two modals: Deactivate Dialog, Payroll Settings Dialog

**Tabs**:

| Tab | Content |
|---|---|
| **Overview** | Branch info (address, contact, type, status), payroll config (working days/hours, employee count, rate formula), deactivate/reactivate buttons, settings button |
| **Employees** | Employee count, "View all in Employees" link to `/employees?branchId=X` |
| **Payroll Settings** | Placeholder for settings history/audit trail |

**User Interactions**:

| Interaction | Trigger | Result |
|---|---|---|
| View details | Page load | `GET /api/branches/:id` |
| Back | "Back to Branches" link | Navigates to `/branches` |
| Reactivate | "Reactivate" button | `POST /api/branches/:id/reactivate` (no confirmation) |
| Deactivate | "Deactivate Branch" button | Opens deactivate confirmation dialog |
| Confirm deactivate | Dialog "Deactivate" | `POST /api/branches/:id/deactivate` |
| Change settings | "Change Payroll Settings" button | Opens payroll settings dialog |
| Preview impact | Input change (D or H) | `GET /api/branches/:id/impact?workingDaysPerMonth=X&workingHoursPerDay=Y` (debounced via React Query) |
| Confirm settings | "Save Changes" button | `POST /api/branches/:id/payroll-settings` (disabled until checkbox confirmed) |
| View employees | "View all in Employees" | Navigates to `/employees?branchId=${id}` |
| Cancel | Cancel / backdrop | Closes open dialog |

**Deactivation Guard (frontend, line 175-178)**:
- "Deactivate" button disabled if `employeeCount > 0`
- Message: "This branch has X active employees. Transfer or deactivate them first."
- Backend also enforces: `ValidationError` if branch has active employees

**Payroll Settings Dialog**:
1. Working Days/Month (number, 1-31)
2. Working Hours/Day (number, 1-24)
3. **Impact Preview Table**: shows each affected employee with old rate → new rate
4. **Formula description**: shows before/after calculation method
5. **Confirmation checkbox**: "I understand that changing these settings will recalculate rates for all employees in this branch"
6. "Save Changes" button: disabled until checkbox is checked

**API calls used**: `branchApi.getById()`, `branchApi.impact()`, `branchApi.updatePayrollSettings()`, `branchApi.deactivate()`, `branchApi.reactivate()`

---

### 3.3 Incentive Sheet — Branch Level

The Incentive Sheet system operates at the **branch × payroll period** level. One sheet exists per unique `(branchId, startDate, endDate)` combination.

#### 3.3.1 Entry Point

**BranchIncentiveDrawer** (`frontend/src/components/payroll/BranchIncentiveDrawer.tsx`, 11 lines)

- A button on the Payroll page: "Branch Incentive Sheet" with table icon
- On click: navigates to `/payroll/incentive-sheet/:periodId`
- Period ID comes from the first payroll in the current batch

#### 3.3.2 IncentiveSheetPage (`/payroll/incentive-sheet/:periodId`)

**File**: `frontend/src/pages/IncentiveSheetPage.tsx` (248 lines)

- **Full-screen page** (no sidebar, no top nav)
- Two tabs: **Daily Input Grid** | **Distribution Preview**
- Keyboard-navigable spreadsheet grid
- Auto-save with 1.5s debounce
- "Save" and "Save & Distribute" actions
- "Back" button with unsaved changes warning

**Spreadsheet Grid** (`IncentiveSheetGrid.tsx`, 262 lines):
- Fixed left column: incentive type labels (Grooming, Surgery, Emergency, Confinement)
- Scrollable day columns: one per day in the period
- Right-sticky Total column
- Cell inputs accept decimal values (step 0.5)
- Tab/Shift+Tab/Enter/Arrow keys for cell navigation
- Horizontal scroll with left/right arrow buttons
- Cells disabled when already distributed

**Distribution Preview** (`DistributionPreviewPanel.tsx`, 127 lines):
- Shows per-type breakdown of shared incentive amounts
- Lists eligible employees per type with amounts
- Shows grand total

**Save & Distribute flow**:
1. `PUT /api/incentive-sheets/:id/inputs` — saves all grid values
2. `POST /api/incentive-sheets/:id/distribute` — calculates per-employee amounts, creates Incentive records, recalculates payrolls, marks sheet as `isDistributed = true`
3. Guard: rejected if any payroll in period is APPROVED or PAID

---

## 4. API Surface

### 4.1 Branch Endpoints

**File**: `backend/src/modules/branches/branch.routes.ts` (76 lines)

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/branches` | JWT | Any | List/search/filter/sort branches |
| GET | `/api/branches/:id` | JWT | Any | Get single branch detail |
| GET | `/api/branches/:id/impact` | JWT | Any | Preview payroll setting changes |
| POST | `/api/branches` | JWT | ADMIN | Create new branch |
| PUT | `/api/branches/:id` | JWT | ADMIN | Update branch info |
| POST | `/api/branches/:id/payroll-settings` | JWT | ADMIN | Update D/H, recalculate all employee rates |
| POST | `/api/branches/:id/deactivate` | JWT | ADMIN | Deactivate branch (blocked if has active employees) |
| POST | `/api/branches/:id/reactivate` | JWT | ADMIN | Reactivate branch |

### 4.2 GET /branches — Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | Case-insensitive name search |
| `type` | BranchType | — | Filter by branch type |
| `status` | active/inactive/all | active | Filter by activation status |
| `sort` | name/employeeCount | name | Sort field |
| `order` | asc/desc | asc | Sort direction |

### 4.3 GET /branches/:id/impact — Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `workingDaysPerMonth` | number | Yes (if checking impact) | Proposed new D value (1-31) |
| `workingHoursPerDay` | number | Yes (if checking impact) | Proposed new H value (1-24) |

**Response**: For each active employee, returns `{ employeeId, name, oldRatePerDay, newRatePerDay, oldRatePerHour, newRatePerHour }` plus formula descriptions.

### 4.4 Incentive Sheet Endpoints

**File**: `backend/src/modules/incentive-sheets/incentive-sheet.routes.ts` (28 lines)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/incentive-sheets` | JWT | Get or auto-create sheet by `branchId`+`startDate`+`endDate` |
| PUT | `/api/incentive-sheets/:id/inputs` | JWT | Save/update daily input values |
| POST | `/api/incentive-sheets/:id/distribute` | JWT | Distribute to employee payrolls, recalculate |

---

## 5. Access Control Model

| Action | Backend Guard | Frontend Condition | Issue? |
|---|---|---|---|
| List branches | Any authenticated user | No guard | — |
| View branch detail | Any authenticated user | No guard | — |
| View impact preview | Any authenticated user | No guard | — |
| Create branch | `requireRole(['ADMIN'])` | Button always visible | **Minor** — non-admin clicks trigger 403 |
| Update branch | `requireRole(['ADMIN'])` | Edit button always visible | **Minor** — non-admin clicks trigger 403 |
| Delete branch | No DELETE route exists! | Delete button always visible | **BUG** — frontend calls `DELETE /branches/:id` which returns 404 |
| Update payroll settings | `requireRole(['ADMIN'])` | Button always visible | **Minor** — non-admin clicks trigger 403 |
| Deactivate branch | `requireRole(['ADMIN'])` | Button always visible | **Minor** — non-admin clicks trigger 403 |
| Reactivate branch | `requireRole(['ADMIN'])` | Button always visible | **Minor** — non-admin clicks trigger 403 |

---

## 6. Validation Rules

### 6.1 Create Branch (`createBranchSchema`)

```typescript
{
  name:             string.min(1)   // required
  address:          string.min(1)   // required
  contact:          string.optional()
  type:             BranchType      // default: VETERINARY_CLINIC
  workingDaysPerMonth:  number.int.min(1).max(31)  // default: 22
  workingHoursPerDay:   number.int.min(1).max(24)  // default: 8
}
```

### 6.2 Update Branch (`updateBranchSchema`)

```typescript
{
  name:     string.min(1).optional()
  address:  string.min(1).optional()
  contact:  string.optional()
  type:     BranchType.optional()
  isActive: boolean.optional()
}
```

### 6.3 Payroll Settings (`payrollSettingsSchema`)

```typescript
{
  workingDaysPerMonth:  number.int.min(1).max(31)  // required
  workingHoursPerDay:   number.int.min(1).max(24)  // required
}
```

### 6.4 Branch Query (`branchQuerySchema`)

```typescript
{
  search: string.optional()
  type:   BranchType.optional()
  status: enum(['active','inactive','all']).default('active')
  sort:   enum(['name','employeeCount']).default('name')
  order:  enum(['asc','desc']).default('asc')
}
```

---

## 7. Database Model

```prisma
model Branch {
  id                   Int               @id @default(autoincrement())
  name                 String
  address              String
  contact              String?
  type                 BranchType        @default(VETERINARY_CLINIC)
  isActive             Boolean           @default(true)
  workingDaysPerMonth  Int               @default(22)
  workingHoursPerDay   Int               @default(8)
  employees            Employee[]        // has many
  users                User[]            // has many (branch managers)
  incentiveSheets      IncentiveSheet[]  // has many (one per period)
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
}
```

**Related model — IncentiveSheet**:
```prisma
model IncentiveSheet {
  id          Int                   @id @default(autoincrement())
  branchId    Int
  branch      Branch                @relation(fields: [branchId], references: [id])
  startDate   DateTime
  endDate     DateTime
  dailyInputs DailyIncentiveInput[]
  isDistributed Boolean             @default(false)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  @@unique([branchId, startDate, endDate])
}
```

---

## 8. Key File Index

| Layer | File | Lines |
|---|---|---|
| **Frontend — Branches page** | `frontend/src/pages/Branches.tsx` | 341 |
| **Frontend — Branch details** | `frontend/src/pages/BranchDetails.tsx` | 276 |
| **Frontend — Incentive sheet page** | `frontend/src/pages/IncentiveSheetPage.tsx` | 248 |
| **Frontend — Incentive sheet grid** | `frontend/src/components/IncentiveSheetGrid.tsx` | 262 |
| **Frontend — Incentive sheet modal** | `frontend/src/components/IncentiveSheetModal.tsx` | 508 |
| **Frontend — Distribution preview** | `frontend/src/components/DistributionPreviewPanel.tsx` | 127 |
| **Frontend — Branch incentive button** | `frontend/src/components/payroll/BranchIncentiveDrawer.tsx` | 11 |
| **Frontend — Branch API client** | `frontend/src/utils/api.ts` (lines 46-59) | 14 |
| **Frontend — Branch types** | `frontend/src/types/index.ts` (lines 24-37, 226-230) | — |
| **Frontend — useIncentiveSheet hook** | `frontend/src/hooks/useIncentiveSheet.ts` | 196 |
| **Backend — Branch routes** | `backend/src/modules/branches/branch.routes.ts` | 76 |
| **Backend — Branch service** | `backend/src/modules/branches/branch.service.ts` | 223 |
| **Backend — Branch schemas** | `backend/src/modules/branches/branch.schema.ts` | 31 |
| **Backend — Incentive sheet routes** | `backend/src/modules/incentive-sheets/incentive-sheet.routes.ts` | 28 |
| **Backend — Incentive sheet service** | `backend/src/modules/incentive-sheets/incentive-sheet.service.ts` | 149 |
| **Backend — Prisma schema (Branch)** | `backend/prisma/schema.prisma` (lines 56-70) | — |
| **Backend — Prisma schema (IncentiveSheet)** | `backend/prisma/schema.prisma` (lines 201-227) | — |

---

## 9. Findings & Observations

### 9.1 Bug: Missing DELETE route
The frontend calls `branchApi.delete(id)` → `DELETE /api/branches/:id`, but **no DELETE route is registered** in `branch.routes.ts`. This will result in a 404 error when a user tries to delete a branch. The delete button exists in the UI but is non-functional.

### 9.2 UX: No frontend role gating
All action buttons (Edit, Delete, Deactivate, Reactivate, Change Settings) are visible to all authenticated users regardless of role. Non-admin users see a 403 error after clicking. The UI should hide or disable these buttons for non-ADMIN users based on the current user's role.

### 9.3 UX: No delete confirmation for incentive sheets
The deactivation dialog properly warns when employees exist, but there is no similar guard for the delete action on the branches list page.

### 9.4 UX: Payroll Settings tab is a placeholder
The "Payroll Settings" tab on the Branch Details page renders no content — it's described as "Placeholder for settings history/audit trail."

### 9.5 Good: Impact preview
The `GET /branches/:id/impact` endpoint with the Payroll Settings dialog provides an excellent UX pattern — users can preview the effect of changing D/H on all employee rates before committing.

### 9.6 Good: Dual deactivation guard
Both frontend (button disabled if employeeCount > 0) and backend (`ValidationError` if active employees exist) protect against deactivating branches with active staff.

