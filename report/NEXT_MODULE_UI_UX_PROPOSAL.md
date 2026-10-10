# Next Module — UI/UX Improvement Proposal

> **Date**: 2026-07-25
> **Status**: Proposal

---

## 1. All Modules Surveyed

| Module | Lines | `window.confirm` | Error Handling | Role Gating | Search/Filter | Pagination |
|---|---|---|---|---|---|---|
| Branches | 341+276 | ~~Yes~~ Fixed | Fixed | Fixed | Added | N/A |
| **Employees** | 700 | Yes (delete) | None | None | Name only (client-side) | None |
| CashAdvances | 332 | Yes (x2) | None | None | isPaid only | None |
| Dashboard | 178 | None | None | None | None | N/A |
| Login | 158 | None | Basic | N/A | N/A | N/A |

**Already-built shared infrastructure**: `ToastContext` (toast notifications), `ConfirmModal` (confirmation dialogs), role gating pattern from Branches.

---

## 2. Recommended Order

### Phase 1 — Employees (highest impact, largest module)

**Why first**: 700 lines, most-used CRUD page, all mutations fail silently, `window.confirm` for delete.

| # | Task | Effort |
|---|---|---|
| 1.1 | Wire `useToast` + `onError` on create/update/delete mutations | S |
| 1.2 | Replace `window.confirm` with `ConfirmModal` for delete | S |
| 1.3 | Add role gating — hide edit/delete buttons from non-ADMIN | S |
| 1.4 | Improve search — include position labels, SSS, TIN, PhilHealth numbers | M |
| 1.5 | Add branch filter + status filter (active/inactive/all) in table header | M |
| 1.6 | Backend: add `DELETE /api/employees/:id` guard (prevent delete if has payrolls) | S |

### Phase 2 — Cash Advances

**Why second**: Smaller module (332 lines), same patterns, quick wins.

| # | Task | Effort |
|---|---|---|
| 2.1 | Wire `useToast` + `onError` on all mutations | S |
| 2.2 | Replace `window.confirm` with `ConfirmModal` for markPaid + delete | S |
| 2.3 | Add role gating | S |
| 2.4 | Add employee name search + branch filter dropdown | M |
| 2.5 | Add date range filter (from/to) | M |

### Phase 3 — Dashboard (quick polish)

| # | Task | Effort |
|---|---|---|
| 3.1 | Add error state with retry button | S |
| 3.2 | Make stat cards permanently clickable (chevron/arrow visible without hover) | S |
| 3.3 | Add month selector for disbursement trend | M |

### Phase 4 — Login (minor fixes)

| # | Task | Effort |
|---|---|---|
| 4.1 | Move demo credentials to env/config | S |
| 4.2 | Differentiate network error vs auth error | S |

---

## 3. Phase 1 Detail — Employees Module

### Current Issues

```
Employees.tsx (700 lines)
├── Search: client-side, name only
├── Filter: branch dropdown only
├── Mutations: create/update/delete
│   ├── onSuccess: invalidate queries
│   └── onError: MISSING → silent failures
├── Delete: window.confirm('Delete employee?')
├── Role gating: None → all users see edit/delete
└── Loading/Empty states: Good
```

### Proposed Changes

**1.1 Toast + Error Handling**
- Add `import { useToast } from '../context/ToastContext'`
- Add `onError: (err) => toastError(err.response?.data?.error || '...')` to create, update, delete mutations
- Add `onSuccess: () => success('Employee created/updated/deleted')` to all mutations

**1.2 ConfirmModal for Delete**
- Replace `window.confirm` with `<ConfirmModal variant="danger" />`  
- Show employee name in the message: "Delete [name]?"
- Disable confirm button while delete is in-flight

**1.3 Role Gating**
- `import { useAuth }` → `const isAdmin = user?.role === 'ADMIN'`
- Hide Edit/Delete action buttons when `!isAdmin`
- Hide "Add Employee" button when `!isAdmin`

**1.4 Improved Search**
- Backend already supports search? (check `employee.service.ts`)
- Search across: name, position, SSS, TIN, PhilHealth, PagIBIG
- Debounced (300ms) server-side search

**1.5 Additional Filters**
- Status filter: Active / Inactive / All
- Branch filter already exists — keep it
- Position filter dropdown (Resident Vet, Junior Vet, Groomer, etc.)

**1.6 Backend DELETE Guard**
- Add guard in `employee.service.ts`: prevent deletion if employee has payroll records
- Return clear error: "Cannot delete employee with existing payroll records"

---

## 4. Effort Estimate

| Phase | Total Effort | Priority |
|---|---|---|
| Phase 1 — Employees | ~2-3h | High |
| Phase 2 — Cash Advances | ~1-2h | High |
| Phase 3 — Dashboard | ~1h | Medium |
| Phase 4 — Login | ~30min | Low |

---

## 5. Decision Needed

**Start with Phase 1 (Employees)?** This gives the highest ROI — it's the most-used page, has the most mutation surface, and benefits directly from the Toast + ConfirmModal infrastructure already built.

The pattern is identical to what was just done for Branches, so implementation will be fast.
