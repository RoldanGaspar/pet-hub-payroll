# Railway Deployment Fix - Schema Migration

## Issue
Railway is encountering Prisma schema migration warnings when deploying. This is because:
1. We removed the `holidayRate` column from `PayrollPeriod`
2. We changed `holidays` from `Integer` to `Decimal(8,2)`

## Solution

These changes are **SAFE** because:
- ✅ Dropping `holidayRate` - This field was removed from our codebase, so it's safe to drop
- ✅ Converting `holidays` from Integer to Decimal - PostgreSQL automatically and safely casts integers to decimals (e.g., `2` becomes `2.00`)

## Quick Fix in Railway Dashboard

### Option 1: Use nixpacks.toml (Recommended - Already Created)
The `nixpacks.toml` file has been created in the `backend/` directory. This will automatically handle the schema migration during build.

**No action needed** - Just commit and push the changes, Railway will use the nixpacks.toml automatically.

### Option 2: Update Build Command Manually
If nixpacks.toml doesn't work, in your Railway backend service settings, update the **Build Command** to:

```bash
npm install && npm run build && npx prisma generate && npm run db:push:force
```

This will automatically accept the safe data transformations.

### Option 2: Manual Fix via Railway CLI
If you prefer to run it manually:

```bash
railway run --service backend npm run db:push:force
```

### Option 3: One-time Manual Command
You can also run this directly in Railway's console:

```bash
npx prisma db push --accept-data-loss
```

## What Happens
- The `holidayRate` column will be dropped (safe - we don't use it anymore)
- The `holidays` column will be converted from Integer to Decimal (safe - PostgreSQL handles this automatically)
- Your existing 12 payroll periods will be preserved with their data intact

## Verification
After the migration, verify your data:

```bash
railway run --service backend npx prisma studio
```

Or check via SQL:
```sql
SELECT id, holidays, "deductionDivisor" FROM "PayrollPeriod";
```

All your existing `holidays` values should be preserved as decimals (e.g., `2` becomes `2.00`).
