# Dashboard UI/UX Enhancement Plan

> **Date**: 2026-07-25
> **Status**: Proposal

---

## 1. Current Dashboard vs Proposed

### Current
```
┌─────────────────────────────────────────────────────┐
│ [Branches] [Employees] [Pending Payrolls] [Monthly]│ ← 4 stat cards
├──────────────────────┬──────────────────────────────┤
│ Recent Payrolls      │ Branch Summary               │
│ (table, top 5)       │ (card list, per branch)      │
└──────────────────────┴──────────────────────────────┘
```

### Proposed
```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Month ▾] [Branch ▾]│ ← period + branch filter
├────────┬────────┬────────┬────────┬────────┬────────────────────┤
│Branches│Active  │Pending │Monthly │Payroll │ Quick Actions       │
│   8    │Emp 124 │  15    │₱842K   │Status  │ [Create Payroll]    │
│ +1 ↑   │  -3 ↓  │  ▲5    │ +12% ↑ │ ████░░ │ [Add Employee]      │
│        │        │        │        │ P:8 A:7│                     │
├────────┴────────┴────────┴────────┴────────┴────────────────────┤
│                                                                   │
│ ┌─────────────────────────┐  ┌──────────────────────────────┐    │
│ │ Monthly Disbursement    │  │ Branch Payroll Comparison     │    │
│ │ █▆▃▇█▅ (bar chart)      │  │ Branch A ████████████  ₱245K  │    │
│ │ Jan Feb Mar Apr May Jun │  │ Branch B ████████      ₱180K  │    │
│ │                         │  │ Branch C ██████████████ ₱312K │    │
│ └─────────────────────────┘  └──────────────────────────────┘    │
│                                                                   │
│ ┌───────────────────────────────────────┐ ┌──────────────────┐   │
│ │ Recent Payrolls (table, last 10)      │ │ Recent Activity   │   │
│ │ Employee  Branch  Period  Net  Status │ │ 📄 Payroll #242   │   │
│ │ ...                                   │ │    approved       │   │
│ │                                       │ │ 👤 Juan Cruz      │   │
│ │                                       │ │    salary updated │   │
│ └───────────────────────────────────────┘ └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. New Backend Data Needed

### 2.1 Monthly Trend Endpoint

`GET /api/dashboard/monthly-trend?months=6&branchId=`

```json
{
  "months": [
    {
      "month": "2026-01",
      "label": "Jan 2026",
      "totalNetPay": 842000,
      "totalGrossPay": 920000,
      "employeeCount": 118,
      "payrollCount": 236
    }
  ]
}
```

**Query**: Group payrolls by month for the last N months, sum net/gross pay, count employees processed.

### 2.2 Branch Comparison Endpoint

`GET /api/dashboard/branch-comparison?month=2026-07`

```json
{
  "branches": [
    {
      "id": 1, "name": "Mandaluyong Vet Clinic",
      "employeeCount": 12, "totalNetPay": 245000,
      "avgPerEmployee": 20416
    }
  ],
  "totalNetPay": 842000
}
```

### 2.3 Recent Activity Endpoint

`GET /api/dashboard/recent-activity?limit=8`

```json
{
  "activities": [
    {
      "type": "payroll_approved",
      "message": "Payroll #242 for Juan Cruz approved",
      "timestamp": "2026-07-25T14:30:00Z",
      "link": "/payroll"
    }
  ]
}
```

**Query**: Can derive from recent payroll status changes, employee updates, branch changes. Or use the audit trail once implemented.

---

## 3. UI Sections — Detailed Design

### 3.1 Enhanced Stat Cards

Each card gets a **trend indicator** and **comparison**:

| Card | Icon | Value | Trend | Comparison |
|---|---|---|---|---|
| Total Branches | Building2 | 8 | +1 from last month | — |
| Active Employees | Users | 124 | -3 from last month | 12 inactive |
| Pending Payrolls | Calculator | 15 | ▲ 5 need attention | 8 Draft / 7 Pending |
| Monthly Disbursement | Wallet | ₱842,450 | +12.5% vs last month | This month |

**Trend colors**: Green arrow up for positive, red arrow down for negative.

### 3.2 Payroll Status Breakdown

A fifth stat card or inline bar showing payroll period distribution:

```
Payroll Status  ████████░░ 8 Draft  ███████░░░ 7 Pending
                ██████████████ 14 Approved  ████████████████████ 20 Paid
```

Or a donut/ring chart. Uses the `byStatus` data already returned by `getPayrollSummary`.

### 3.3 Monthly Disbursement Chart (Bar Chart)

Uses [Recharts](https://recharts.org). Shows last 6 months of total net pay disbursed:

```
  ₱1M ┤
      │     ██
₱800K ┤ ██  ██  ██
      │ ██  ██  ██  ██
₱600K ┤ ██  ██  ██  ██  ██
      │ ██  ██  ██  ██  ██  ██
₱400K ┤─────────────────────────
       Jan  Feb  Mar  Apr  May  Jun
```

- Bar color: `#16a34a` (primary-600)
- Hover: tooltip shows exact amount + employee count
- Click: navigates to payroll filtered by that month

### 3.4 Branch Comparison Chart (Horizontal Bar)

Shows per-branch disbursement this month, sorted highest to lowest:

```
Mandaluyong Vet Clinic   ████████████████████  ₱245,000  (12 emp)
Makati Vet Hospital      ██████████████        ₱180,000  (8 emp)
Quezon City Clinic       ██████████████████████ ₱312,000  (15 emp)
Pasig Trading            ████████              ₱105,000  (5 emp)
```

- Bar width proportional to total net pay
- Shows employee count per branch
- Click navigates to branch detail

### 3.5 Quick Actions Panel

Common tasks accessible directly from dashboard:

```
┌──────────────────┐
│ Quick Actions     │
│                   │
│ [+ Create Payroll]│ → opens CreatePeriodWizard modal
│ [+ Add Employee]  │ → opens employee create modal inline
│ [📄 View Payslips]│ → navigates to /payslips
│ [💰 Cash Advances]│ → navigates to /cash-advances
└──────────────────┘
```

Role-gated: only actions the user can perform.

### 3.6 Recent Activity Feed

Shows last 8 system events:

```
📄 Payroll #242 for Juan Cruz approved    2 min ago
📄 Batch payroll for Period 1-15 Jul approved  10 min ago
👤 Maria Santos salary updated to ₱28,000    1 hour ago
🏥 Mandaluyong Vet Clinic payroll settings updated  3 hours ago
👤 New employee: Pedro Reyes added to Makati   Yesterday
```

- Each item is clickable (navigates to relevant page)
- Icons indicate event type (payroll, employee, branch)
- Relative timestamps ("2 min ago", "Yesterday")

### 3.7 Period Selector

A month/year dropdown in the header:

```
Dashboard                          [ July 2026 ▾ ] [ All Branches ▾ ]
```

- Changing the month refetches all data filtered to that period
- Branch dropdown filters dashboard to a single branch
- URL params preserve selection: `/dashboard?month=2026-07&branchId=3`

---

## 4. Layout Strategy

### Desktop (≥1024px)
```
┌────────────────────────────────────────────────────────────┐
│ Header + Filters                                            │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Stat 1   │ Stat 2   │ Stat 3   │ Stat 4   │ Payroll Status│
│          │          │          │          │ Breakdown     │
├──────────┴──────────┴──────────┴──────────┴───────────────┤
│ ┌─────────────────────────┐  ┌───────────────────────────┐ │
│ │ Disbursement Trend      │  │ Branch Comparison          │ │
│ │ (2/3 width)             │  │ (1/3 width)                │ │
│ └─────────────────────────┘  └───────────────────────────┘ │
├──────────────────────────────┬─────────────────────────────┤
│ Recent Payrolls (2/3)        │ Activity Feed (1/3)         │
└──────────────────────────────┴─────────────────────────────┘
```

### Mobile (<768px)
```
┌────────────────────────────┐
│ Header + Filters            │
├──────────┬─────────────────┤
│ Stat 1   │ Stat 2          │
├──────────┼─────────────────┤
│ Stat 3   │ Stat 4          │
├──────────┴─────────────────┤
│ Payroll Status Breakdown   │
├────────────────────────────┤
│ Disbursement Trend (full)  │
├────────────────────────────┤
│ Branch Comparison (full)   │
├────────────────────────────┤
│ Recent Payrolls             │
├────────────────────────────┤
│ Activity Feed               │
└────────────────────────────┘
```

---

## 5. Implementation Plan

### Phase 1 — Backend (New Endpoints)
| # | Task | Effort |
|---|---|---|
| 1.1 | `GET /api/dashboard/monthly-trend` — last 6 months aggregation | 1h |
| 1.2 | `GET /api/dashboard/branch-comparison` — per-branch disbursement | 45min |
| 1.3 | `GET /api/dashboard/recent-activity` — last 8 events | 1h |

### Phase 2 — Frontend Recharts Integration
| # | Task | Effort |
|---|---|---|
| 2.1 | Install Recharts, create wrapper components | 30min |
| 2.2 | Monthly Disbursement Bar Chart component | 1h |
| 2.3 | Branch Comparison Horizontal Bar Chart component | 1h |
| 2.4 | Payroll Status Breakdown (Stacked bar or Donut) | 1h |

### Phase 3 — Enhanced Stat Cards
| # | Task | Effort |
|---|---|---|
| 3.1 | Add trend indicators (↑↓ with percentage change) | 1h |
| 3.2 | Comparison to previous period | 30min |

### Phase 4 — New Sections
| # | Task | Effort |
|---|---|---|
| 4.1 | Period selector (month picker + branch filter) | 1h |
| 4.2 | Quick Actions panel (role-gated) | 45min |
| 4.3 | Recent Activity Feed | 1h |

### Phase 5 — Responsive Layout
| # | Task | Effort |
|---|---|---|
| 5.1 | Responsive grid for all sections | 1h |
| 5.2 | Mobile-first testing | 30min |

### Total Effort: ~10 hours

---

## 6. Dependencies to Install

```bash
cd frontend
npm install recharts
```

That's it — everything else uses existing infrastructure (React Query, Tailwind, Lucide icons, shadcn-style cards).

---

## 7. What This Gives You

| Before | After |
|---|---|
| "How are we doing this month?" → Guess | See 6-month trend at a glance |
| "Which branch costs the most?" → Calculate manually | Horizontal bar chart, instant |
| "How many payrolls need approval?" → Single number | See Draft vs Pending breakdown |
| "What happened recently?" → No idea | Activity feed shows last 8 events |
| "I need to create payroll" → Navigate to Payroll page | Quick action button on dashboard |
| Same data every visit | Period selector — look at any month |

---

*Ready for approval. Want me to start with Phase 1 (backend endpoints)?*
