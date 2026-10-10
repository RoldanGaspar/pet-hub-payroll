# shadcn/ui Integration Plan

> **Date**: 2026-07-25
> **Current**: Pure TailwindCSS v4 — all components hand-built from scratch
> **Target**: shadcn/ui component library — copy-paste owned components

---

## 1. Why shadcn/ui Specifically

| Criteria | shadcn/ui | MUI | Ant Design | Chakra UI |
|---|---|---|---|---|
| Tailwind compatible | Native | No (CSS-in-JS) | No (Less/CSS-in-JS) | No (Emotion) |
| Bundle weight | Only what you use | ~200KB+ | ~500KB+ | ~150KB+ |
| Customizable | Full control (you own the code) | Theme only | Theme only | Theme only |
| Accessibility | Radix primitives (WCAG AAA) | Partial | Partial | Good |
| React 19 support | Yes | Partial | Partial | Yes |
| Learning curve | Low (same Tailwind) | Medium | High | Medium |

**Verdict**: shadcn/ui is the only option that works with our existing TailwindCSS v4 setup without conflicts.

---

## 2. Setup

### Step 1: Initialize

```bash
cd frontend
npx shadcn@latest init
```

This creates:
- `components.json` — config file
- `src/lib/utils.ts` — we already have `utils/helpers.ts` with `cn()`, just point to it
- Tailwind config merge

### Step 2: Install Components We Actually Need

```bash
# Core primitives
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add badge
npx shadcn@latest add table

# Overlays (replaces our manual modals + ConfirmModal + ToastContext)
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add sonner    # Toast replacement (better than our ToastContext)

# Forms
npx shadcn@latest add select
npx shadcn@latest add command   # Searchable combobox
npx shadcn@latest add checkbox
npx shadcn@latest add textarea

# Navigation
npx shadcn@latest add tabs

# Data display
npx shadcn@latest add calendar
npx shadcn@latest add skeleton
npx shadcn@latest add tooltip

# Layout
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
```

---

## 3. What Gets Replaced

| Current | Replaced By | Impact |
|---|---|---|
| `btn-primary` / `btn-secondary` CSS classes | `<Button variant="default">` / `<Button variant="outline">` | All pages |
| Custom modal markup (fixed div + backdrop) | `<Dialog>` + `<DialogContent>` + `<DialogHeader>` | All modals |
| `ConfirmModal.tsx` (custom) | `<AlertDialog>` + `<AlertDialogAction>` | Delete confirmations |
| `ToastContext.tsx` (custom) | `<Toaster>` + `toast()` from sonner | All toast calls |
| `<input className="input">` | `<Input />` | All forms |
| `<select className="input">` | `<Select>` + `<SelectTrigger>` + `<SelectContent>` | All dropdowns |
| `<table className="table">` | `<Table>` + `<TableHeader>` + `<TableBody>` + `<TableRow>` + `<TableCell>` | All data tables |
| `<span className="badge">` | `<Badge variant="default">` / `<Badge variant="destructive">` | Status indicators |
| `<div className="card">` | `<Card>` + `<CardHeader>` + `<CardContent>` | Card grids |
| `<div className="animate-pulse">` | `<Skeleton>` | Loading states |
| Manual tab buttons | `<Tabs>` + `<TabsList>` + `<TabsTrigger>` + `<TabsContent>` | Branch Details tabs |

---

## 4. Migration Plan

### Phase 1 — Core Primitives (1-2h)
Install: `button`, `card`, `input`, `badge`, `skeleton`

| File | Change |
|---|---|
| `index.css` | Remove `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.label`, `.badge` classes |
| All pages | Replace Tailwind button classes with `<Button>` |
| All pages | Replace `<div className="card">` with `<Card>` |
| All pages | Replace `<input className="input">` with `<Input>` |
| All pages | Replace `<span className="badge">` with `<Badge>` |

### Phase 2 — Overlays (1-2h)
Install: `dialog`, `alert-dialog`, `sonner`

| File | Change |
|---|---|
| `App.tsx` | Add `<Toaster />` at root, remove `<ToastProvider>` |
| All pages | Replace `useToast()` with `toast()` from sonner |
| All pages | Replace custom modal markup with `<Dialog>` |
| All pages | Replace `<ConfirmModal>` with `<AlertDialog>` |
| `ConfirmModal.tsx` | Delete |
| `ToastContext.tsx` | Delete |

### Phase 3 — Form Controls (1h)
Install: `select`, `command`, `checkbox`, `textarea`

| File | Change |
|---|---|
| All pages | Replace `<select>` with `<Select>` |
| CashAdvances, Payroll | Replace employee `<select>` with `<Command>` (searchable combobox) |
| All forms | Replace `<textarea>` with `<Textarea>` components |

### Phase 4 — Data Display (1h)
Install: `table`, `tabs`, `calendar`, `tooltip`

| File | Change |
|---|---|
| All pages | Replace `<table className="table">` with `<Table>` |
| BranchDetails | Replace manual tab buttons with `<Tabs>` |
| Login, forms | Add `<Tooltip>` on icon buttons |

### Phase 5 — Polish (1h)
Install: `separator`, `scroll-area`

| File | Change |
|---|---|
| Login | Replace "or" divider with `<Separator>` |
| Branch Details | Add `<ScrollArea>` for overflow content |

---

## 5. Total Impact

| Metric | Before | After |
|---|---|---|
| Pages touched | 9 | 9 (all rewritten) |
| CSS removed | ~76 lines (custom classes) | 0 |
| Custom components deleted | 2 (ToastContext, ConfirmModal) | 0 |
| New shadcn components | 0 | ~20 |
| Bundle size change | ~1MB | ~1.1MB (negligible — tree-shaken) |
| Code per page | 300-700 lines | ~200-400 lines |
| Accessibility | Manual | WCAG AAA via Radix |
| Keyboard nav | Partial | Full (Esc closes modals, Tab cycles) |

---

## 6. Risk / Blockers

| Risk | Severity | Mitigation |
|---|---|---|
| TailwindCSS v4 compatibility | Medium | shadcn/ui has a `@tailwindcss/vite` + v4 init path |
| Existing custom CSS conflicts | Low | Remove our custom classes, let shadcn handle styling |
| Bundle size increase | Low | shadcn only ships what you import — ~2KB per component |
| Dev time on migration | Medium | Phase-by-phase, each page rewrites in ~10-15 min |

---

## 7. Decision Needed

**Proceed with shadcn/ui integration?**

If yes, I'll start Phase 1 — init shadcn, install core primitives, and migrate the smallest page (Login) as a proof of concept before rolling out to all pages.

**Total effort**: ~6-8 hours across 5 phases.
