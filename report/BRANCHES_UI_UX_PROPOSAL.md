# Branches Module — UI/UX Improvement Proposal

> **Date**: 2026-07-25
> **Based on**: `BRANCHES_UI_UX_WORKFLOW.md`
> **Status**: Proposal — awaiting approval

---

## 1. Current State Summary

| Aspect | Current |
|---|---|
| Branches list | Card grid only, no search/filter/sort UI (backend supports it) |
| Role gating | None in frontend — non-admins see buttons that trigger 403 |
| Delete | `window.confirm` dialog, no backend DELETE route (404 bug) |
| Detail page tabs | Overview, Employees (link only), Payroll Settings (empty placeholder) |
| Confirmation dialogs | Deactivate only; all others use browser `confirm()` |
| Feedback | No toast/snackbar for success/error operations |
| Loading/empty states | Minimal |

---

## 2. Proposed Improvements

### A. Branches List Page (`/branches`)

#### A1. Fix Critical Bug — Add DELETE Route
- **Priority**: Critical / Bug
- **Backend**: Add `DELETE /api/branches/:id` to `branch.routes.ts` with `requireRole(['ADMIN'])`
- **Guard**: Prevent deletion if branch has employees, payrolls, or users

#### A2. Role-Based UI Gating
- **Priority**: High
- Hide Edit/Delete icons from non-ADMIN users
- Hide "+ Add Branch" button from non-ADMIN users
- Hide deactivate/reactivate/settings buttons on detail page for non-ADMIN users
- Use the user context/state already available in the app

#### A3. Search & Filter Bar
- **Priority**: High
- **Backend already supports**: `search`, `type`, `status`, `sort`, `order` query params
- Add a search input above the card grid (debounced, 300ms)
- Add filter chips/dropdowns: Type (All/Vet Clinic/Vet Hospital/Trading), Status (Active/Inactive/All)
- Add sort dropdown: Name A-Z, Name Z-A, Most Employees, Fewest Employees

```
┌─────────────────────────────────────────────────────────────────┐
│  [🔍 Search branches...]  [Type ▾]  [Status ▾]  [Sort ▾]       │
│                                                      [+ Add]   │
└─────────────────────────────────────────────────────────────────┘
```

#### A4. View Toggle — Card vs Table
- **Priority**: Medium
- Add toggle between Card Grid and Table/List view
- Table view columns: Name, Type, Address, Employees, Working Days/Hours, Status, Actions
- Table view supports the same search/filter/sort
- Remember user preference in localStorage

#### A5. Replace window.confirm with Modal
- **Priority**: Medium
- Replace browser `confirm()` with a proper confirmation modal for Delete
- Show what will be affected: "Deleting [branch name] will also remove..."
- Require typing the branch name for destructive actions

```
┌──────────────────────────────────────────┐
│  Delete Branch                           │
│                                          │
│  ⚠️ This action cannot be undone.        │
│                                          │
│  Branch: Mandaluyong Veterinary Clinic   │
│  Employees: 12 (will be unlinked)        │
│                                          │
│  Type "Mandaluyong Veterinary Clinic"    │
│  to confirm: [________________]          │
│                                          │
│  [Cancel]          [Delete Branch]       │
└──────────────────────────────────────────┘
```

#### A6. Empty State
- **Priority**: Low
- When no branches match filters: show illustration + "No branches found" + "Clear filters" button
- When no branches exist at all: show illustration + "Create your first branch" + CTA button

#### A7. Loading State
- **Priority**: Low
- Replace simple "Loading..." text with skeleton cards (animated placeholder shapes matching card layout)

---

### B. Branch Details Page (`/branches/:id`)

#### B1. Implement Payroll Settings Tab
- **Priority**: High
- Currently an empty placeholder
- Show **settings history / audit trail**:
  - Timestamp, who changed, old D/H → new D/H
  - Number of employees affected
  - Link to view employee rate changes
- OR repurpose as **Branch Statistics**:
  - Total payroll processed (all time / this month)
  - Active payroll periods
  - Recent activity

#### B2. Employees Tab — Inline Mini List
- **Priority**: Medium
- Currently just shows count + link to `/employees?branchId=X`
- Add a compact table showing first 5 employees directly in the tab:
  - Name, Position, Salary, Rate/Day
  - "View all X employees →" link at bottom

#### B3. Breadcrumb Navigation
- **Priority**: Low
- Add breadcrumb: `Branches > Mandaluyong Veterinary Clinic`
- Consistent with how users navigate

#### B4. Quick Actions Header
- **Priority**: Medium
- Add action buttons in the header area (not just in tabs):
  - Edit Branch (opens edit modal)
  - Deactivate/Reactivate
  - Change Payroll Settings
- Status badge prominently displayed (Active/Inactive with color)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Branches  >  Mandaluyong Veterinary Clinic    ● Active   │
│                                                             │
│  [Edit]  [Deactivate]  [Payroll Settings]                   │
│                                                             │
│  ├─ OVERVIEW ─┼─ EMPLOYEES (12) ─┼─ SETTINGS ─┤            │
│  │                                                         │
│  │  ...content...                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### C. System-Wide UX Improvements

#### C1. Toast Notification System
- **Priority**: High
- Replace silent success/failure with toast notifications
- Success: green toast "Branch created successfully"
- Error: red toast with error message from API
- Use a lightweight toast library or build with existing UI

#### C2. Optimistic Updates
- **Priority**: Medium
- For non-critical mutations (deactivate, reactivate, edit), update UI immediately then rollback on error
- React Query `onMutate` / `onError` / `onSettled` pattern

#### C3. Consistent Confirmation Modals
- **Priority**: High
- All destructive/irreversible actions use a proper modal (not `window.confirm`)
- Modes:
  - **Simple confirm**: "Are you sure?" + Confirm/Cancel
  - **Typed confirm**: requires typing the resource name (delete branch, change payroll settings)
  - **Info confirm**: shows impact before confirming (deactivate, change settings)

---

## 3. Proposed New User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BRANCHES PAGE  (/branches)                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ [🔍 Search...]  [Type ▾]  [Status: Active ▾]  [Sort ▾]      │       │
│  │                                              ┌────┐ ┌────┐   │       │
│  │                                              │ ██ │ │ ☰  │   │       │
│  │                                              │card│ │tbl │   │       │
│  │                                              └────┘ └────┘   │       │
│  │                                                     [+ Add]  │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ Branch 1 │ │ Branch 2 │ │ Branch 3 │ │ Branch 4 │   Card Grid      │
│  │  🏥      │ │  🏥      │ │  🏪      │ │  🏥      │                  │
│  │ Active ● │ │ Active ● │ │ Inactive │ │ Active ● │                  │
│  │ 12 emp.  │ │ 8 emp.   │ │ 0 emp.   │ │ 15 emp.  │                  │
│  │ D:22 H:8 │ │ D:22 H:8 │ │ D:26 H:8 │ │ D:20 H:10│                  │
│  │ [✏️][🗑️] │ │ [✏️][🗑️] │ │ [✏️][🗑️] │ │ [✏️][🗑️] │  (admin only)  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                         │
│  Click card ──────────────────────────────────────────────┐             │
│  (or click ✏️ to edit, 🗑️ to delete with modal)          │             │
└───────────────────────────────────────────────────────────┼─────────────┘
                                                            │
┌───────────────────────────────────────────────────────────┼─────────────┐
│            BRANCH DETAILS PAGE  (/branches/:id)           │             │
│                                                           │             │
│  ← Branches  >  Mandaluyong Vet Clinic        ● Active    │             │
│  [✏️ Edit]  [⏸ Deactivate]  [⚙ Payroll Settings]         │             │
│                                                           │             │
│  ┌─ Overview ───┬─ Employees (12) ─┬─ Activity ──────┐   │             │
│  │              │                 │                  │   │             │
│  │ Branch Info  │ ┌─────────────┐ │ Jul 24  Admin    │   │             │
│  │ Address      │ │ Juan Cruz   │ │   Deactivated    │   │             │
│  │ Contact      │ │ Vet | 45k   │ │ Jul 20  Admin    │   │             │
│  │ Type         │ │ Maria S.    │ │   Changed D:22   │   │             │
│  │              │ │ Groom | 22k │ │   → D:24         │   │             │
│  │ Payroll Conf │ │ ...         │ │ Jul 15  System   │   │             │
│  │ D:22  H:8    │ │             │ │   Branch created │   │             │
│  │ Formula: MON │ │ View all →  │ │                  │   │             │
│  └──────────────┴─┴─────────────┴─┴──────────────────┘   │             │
│                                                           │             │
│  Modals (as needed):                                      │             │
│  ┌─────────────────────┐ ┌──────────────────────────┐     │             │
│  │ Deactivate Branch   │ │ Change Payroll Settings   │     │             │
│  │ (impact info)       │ │ (impact preview +         │     │             │
│  │                     │ │  typed confirmation)      │     │             │
│  └─────────────────────┘ └──────────────────────────┘     │             │
└───────────────────────────────────────────────────────────┘             │

Toast notifications appear at top-right for all mutations:
  ✓ Branch created successfully
  ✗ Failed to deactivate: branch has 12 active employees
```

---

## 4. Implementation Priority Matrix

| # | Task | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | **Add DELETE route + guard** | Critical | S | Fixes broken feature |
| 2 | **Frontend role-based UI gating** | High | S | Prevents 403 confusion |
| 3 | **Toast notification system** | High | M | All mutations benefit |
| 4 | **Search/filter bar on list page** | High | M | Backend already supports |
| 5 | **Replace window.confirm with modals** | High | S | Better UX for all deletes |
| 6 | **Consistent confirmation modal component** | High | M | Reusable across app |
| 7 | **Implement Activity/Settings tab** | High | M | Fills empty placeholder |
| 8 | **View toggle (card vs table)** | Medium | M | Power users |
| 9 | **Employees tab inline list** | Medium | S | Reduces navigation |
| 10 | **Optimistic updates** | Medium | M | Feels faster |
| 11 | **Loading skeletons** | Low | S | Polished feel |
| 12 | **Empty states** | Low | S | New user experience |
| 13 | **Breadcrumb navigation** | Low | S | Navigation clarity |

**Effort**: S = Small (<1h), M = Medium (1-3h), L = Large (3-8h)

---

## 5. Suggested Implementation Order

**Batch 1 — Bug Fixes + Quick Wins** (est. 2-3h):
- #1: DELETE route + guard
- #2: Frontend role gating
- #3: Toast notification system
- #5: Replace window.confirm with modal component

**Batch 2 — Feature Completion** (est. 4-6h):
- #4: Search/filter bar
- #6: Reusable confirmation modal component
- #7: Activity/Settings tab implementation

**Batch 3 — Polish** (est. 4-6h):
- #8: View toggle
- #9: Employees inline list
- #10: Optimistic updates

**Batch 4 — Nice to Have** (est. 2-3h):
- #11: Loading skeletons
- #12: Empty states
- #13: Breadcrumbs

---

## 6. Design Decisions to Confirm

1. **Confirmation modal approach**: Build a reusable generic `ConfirmModal` component with modes (simple/typed/info), or use a library like `@radix-ui/react-alert-dialog`?

2. **Toast library**: Build lightweight custom toast with React context, or use `sonner` / `react-hot-toast`?

3. **Settings tab content**: Audit trail of D/H changes, or branch statistics dashboard? (Audit trail requires a new DB table; stats can use existing queries.)

4. **Table view columns**: What columns matter most to the users? (Name, Type, Employees, Status, D/H values?)

5. **Delete branch behavior**: What happens to employees when a branch is deleted? Soft-delete (mark inactive)? Hard-delete with employee reassignment? Block deletion if branch has any data?

---

*Proposal ready for review. Once approved, I'll implement batch by batch.*
