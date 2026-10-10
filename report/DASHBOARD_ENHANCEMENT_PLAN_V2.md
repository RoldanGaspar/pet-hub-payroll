# Dashboard UI/UX Enhancement Plan — v2 (Revised)

> **Date**: 2026-07-25
> **Status**: Revised based on stakeholder feedback
> **Rating**: 8.8-9/10 base plan, now enhanced with operations-focused additions

---

## Revised Dashboard: Command Center Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Dashboard                          [ July 2026 ▾ ]  [ All Branches ▾ ]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │👥 Active │ │📋 Today's│ │⚠ Pending│ │💰 Monthly │ │💵 Gross / Net │ │
│  │Employees│ │Attendance│ │ Payrolls │ │Disburse.  │ │  Payroll      │ │
│  │   124    │ │ P:118 A:4│ │    15    │ │  ₱842K    │ │₱1.25M/₱1.08M│ │
│  │  -3 ↓   │ │ L:7  Lv:3│ │  +5 ▲    │ │  +12% ↑   │ │              │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────────┘ │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────┐ ┌────────────────────────────┐ │
│  │ 📊 Monthly Disbursement Trend       │ │ 🏥 Branch Payroll Comp.     │ │
│  │ █▆▃▇█▅  Last 6 months              │ │ Mandaluyong ████████ ₱245K  │ │
│  │ Jan Feb Mar Apr May Jun             │ │ Makati      ██████   ₱180K  │ │
│  │                                     │ │ Quezon City ██████████₱312K │ │
│  │                                     │ │ Pasig       ████     ₱105K  │ │
│  └─────────────────────────────────────┘ └────────────────────────────┘ │
│                                                                          │
│  ┌──────────────────┐ ┌──────────────────────────────────────────────┐  │
│  │ 👥 Employees by  │ │ 💰 Financial Breakdown (This Month)           │  │
│  │    Position      │ │                                              │  │
│  │  🟢 Vet    15    │ │ Gross Payroll    ₱1,254,200                  │  │
│  │  🔵 Groomer 23   │ │ Net Payroll      ₱1,082,300                  │  │
│  │  🟡 Asst.   42   │ │ ─────────────────────────────────────        │  │
│  │  🟠 Staff   18   │ │ Deductions:                                  │  │
│  │  (pie chart)     │ │   SSS           ₱42,000                      │  │
│  │                  │ │   PhilHealth    ₱18,500                      │  │
│  │                  │ │   Pag-IBIG      ₱8,200                       │  │
│  │                  │ │   W/Tax         ₱65,400                      │  │
│  │                  │ │   Insurance     ₱24,000                      │  │
│  │                  │ │   Loans         ₱14,000                      │  │
│  └──────────────────┘ └──────────────────────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │ ⚠ Alerts & Notifications│ │ 📅 Payroll Calendar — July 2026       │  │
│  │                          │ │ Su Mo Tu We Th Fr Sa                  │  │
│  │ 🔴 15 payrolls awaiting  │ │              1  2  3  4              │  │
│  │    approval              │ │  5  6  7  8  9 10 11                 │  │
│  │ 🟡 3 employees missing   │ │ 12 13 14[15]16 17 18  ← Payroll Run  │  │
│  │    ATM account           │ │ 19 20 21 22 23 24 25                 │  │
│  │ 🟡 Contract expires:     │ │ 26 27 28 29[30]31     ← Payroll Run  │  │
│  │    Juan Cruz (5 days)    │ │                                      │  │
│  │ 🔵 PhilHealth updated    │ │ 🇵🇭 Holiday: Jul 17 (Eid al-Adha)   │  │
│  │                          │ │                                          │
│  │ [View All Alerts]        │ │ Upcoming: ₱865,000 estimated next run  │
│  └──────────────────────────┘ └──────────────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ 📋 Recent Payrolls       │ │ 📁 Recent Imports │ │ 🔍 Recent Activity│ │
│  │ Employee  Net   Status   │ │ Payroll_Jul.xlsx  │ │ ✅ Payroll #51    │ │
│  │ Juan C.   ₱18K Approved  │ │ Imported 2m ago   │ │    approved      │ │
│  │ Maria S.  ₱22K Paid      │ │ Attendance.xlsx   │ │ ✏️ Maria Santos   │ │
│  │ Pedro R.  ₱15K Pending   │ │ Imported 1d ago   │ │    salary ₱28K   │ │
│  │ ...                      │ │ Emp_List.xlsx     │ │ 🗑️ Admin deleted  │ │
│  │                          │ │ Imported 3d ago   │ │    Branch #5     │ │
│  │ [View All Payrolls]      │ │                   │ │                  │ │
│  └──────────────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## New Backend Endpoints Required

### Existing (Keep)
| Endpoint | Purpose |
|---|---|
| `GET /api/dashboard/stats` | Core KPIs (existing) |
| `GET /api/dashboard/payroll-summary` | Payroll breakdown by period (existing) |

### New (Phase 1A)
| # | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /api/dashboard/monthly-trend?months=6&branchId=` | Last N months disbursement data for bar chart |
| 2 | `GET /api/dashboard/branch-comparison?month=&branchId=` | Per-branch net pay + employee count |
| 3 | `GET /api/dashboard/recent-activity?limit=8` | Last N system events (payroll approvals, employee changes, branch updates) |

### New (Phase 1B — Operations-Focused)
| # | Endpoint | Purpose |
|---|---|---|
| 4 | `GET /api/dashboard/today-attendance?branchId=` | Today's present/absent/late/leave counts |
| 5 | `GET /api/dashboard/financial-breakdown?month=&branchId=` | Gross pay, net pay, deductions by category (SSS, PhilHealth, Pag-IBIG, WTax, Insurance, Loans) |
| 6 | `GET /api/dashboard/employee-distribution?branchId=` | Employee count by position for pie chart |
| 7 | `GET /api/dashboard/alerts` | Pending approvals, missing data, expiring contracts |
| 8 | `GET /api/dashboard/payroll-calendar?month=&year=` | Payroll run dates, holidays, deadlines |
| 9 | `GET /api/dashboard/payroll-forecast?branchId=` | Estimated next payroll run amount |
| 10 | `GET /api/dashboard/recent-imports?limit=5` | Last N file imports (if import feature exists) |

---

## Implementation Phases (Revised)

### Phase 1A — Core Charts + Trends (~3h)
| # | Task | Effort |
|---|---|---|
| 1 | Install Recharts | 5min |
| 2 | `GET /api/dashboard/monthly-trend` endpoint | 45min |
| 3 | Monthly Disbursement Bar Chart component | 1h |
| 4 | `GET /api/dashboard/branch-comparison` endpoint | 30min |
| 5 | Branch Comparison Horizontal Bar Chart | 45min |

### Phase 1B — Operations Endpoints (~3h)
| # | Task | Effort |
|---|---|---|
| 6 | `GET /api/dashboard/financial-breakdown` endpoint | 1h |
| 7 | `GET /api/dashboard/employee-distribution` endpoint | 30min |
| 8 | `GET /api/dashboard/alerts` endpoint | 45min |
| 9 | `GET /api/dashboard/payroll-calendar` endpoint | 30min |
| 10 | `GET /api/dashboard/payroll-forecast` endpoint | 15min |

### Phase 2 — Enhanced Stat Cards (~2h)
| # | Task | Effort |
|---|---|---|
| 11 | Trend indicators (↑↓ arrows with percentage) on all stat cards | 45min |
| 12 | New "Today's Attendance" stat card | 30min |
| 13 | New "Gross / Net Payroll" stat card | 30min |
| 14 | Period selector (month picker) + branch filter | 30min |

### Phase 3 — New Dashboard Sections (~3h)
| # | Task | Effort |
|---|---|---|
| 15 | Financial Breakdown panel (gross/net + deductions table) | 1h |
| 16 | Employee Distribution pie chart | 45min |
| 17 | Alerts & Notifications panel | 1h |
| 18 | Payroll Calendar component | 1h |

### Phase 4 — Bottom Panels (~2h)
| # | Task | Effort |
|---|---|---|
| 19 | Recent Activity Feed (replaces basic table) | 1h |
| 20 | Quick Actions panel | 30min |
| 21 | Recent Imports panel (if import feature exists) | 30min |

### Phase 5 — Responsive Layout (~2h)
| # | Task | Effort |
|---|---|---|
| 22 | Responsive grid — mobile stacks, desktop 2-column/3-column | 1h |
| 23 | Loading skeletons per section (not one big spinner) | 30min |
| 24 | Error states per section (section fails, others still load) | 30min |

**Total Effort: ~15 hours** (up from 10 hours after adding operations-focused sections)

---

## Dashboard Hierarchy (Final)

```
HEADER BAR
├── Page Title: "Dashboard"
├── Branch Selector: [All Branches ▾]
└── Period Selector: [July 2026 ▾]

ROW 1 — Quick KPIs (5 cards)
├── Active Employees (124, -3 ↓)
├── Today's Attendance (P:118, A:4, L:7, Lv:3)
├── Pending Payrolls (15, +5 ▲)
├── Monthly Disbursement (₱842K, +12% ↑)
└── Gross / Net Payroll (₱1.25M / ₱1.08M)

ROW 2 — Charts (2 panels)
├── Monthly Disbursement Trend (bar chart, 6 months)
└── Branch Comparison (horizontal bars)

ROW 3 — Secondary Charts (2 panels)
├── Employee Distribution (pie chart by position)
└── Financial Breakdown (gross/net + deduction categories)

ROW 4 — Operations (2 panels)
├── Alerts & Notifications
└── Payroll Calendar

ROW 5 — Activity (3 panels)
├── Recent Payrolls (table)
├── Recent Activity (feed)
└── Recent Imports (list)
```

---

## Mobile Layout Strategy

```
MOBILE (<768px)
┌─────────────────────┐
│ Header + Filters     │
├─────────────────────┤
│ Active Employees     │
│ Today's Attendance   │
│ Pending Payrolls     │
│ Monthly Disbursement │
│ Gross / Net          │
├─────────────────────┤
│ Trend Chart          │
│ Branch Comparison    │
│ Emp. Distribution    │
│ Financial Breakdown  │
├─────────────────────┤
│ Alerts               │
│ Payroll Calendar     │
├─────────────────────┤
│ Recent Payrolls      │
│ Recent Activity      │
└─────────────────────┘

All sections stack vertically. Charts are full-width.
```

---

## What Changed from v1

| Feature | v1 | v2 (Revised) |
|---|---|---|
| Stat cards | 4 cards | 5 cards (+ Attendance, + Gross/Net) |
| Charts | 2 (trend, branch) | 4 (trend, branch, employee pie, financial) |
| Operations | None | Alerts, Payroll Calendar, Forecast |
| Backend endpoints | 3 new | 10 new total |
| Activity | Recent payrolls only | Recent payrolls + Activity feed + Imports |
| Layout | 3 rows | 5 rows, command center layout |
| Total effort | ~10h | ~15h |

---

## Dependencies

```bash
cd frontend
npm install recharts
```

No other new dependencies — everything uses existing stack (React Query, Tailwind, Lucide icons).

---

*Plan revised based on stakeholder input. Ready to begin Phase 1A implementation.*
