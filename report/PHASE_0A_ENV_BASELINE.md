# Phase 0A — Environment Baseline

> Captured: 2026-07-23 | Branch: `refactor/modular-monolith` | Tag: `baseline-pre-refactor`

## Backend Configuration (`backend/.env`)

| Key | Location | Required | Default | Notes |
|-----|----------|----------|---------|-------|
| `DATABASE_URL` | .env | Yes | — | PostgreSQL connection string (Railway auto-provisions) |
| `JWT_SECRET` | .env | Yes | — | Strong random string; crashes on startup if not set |
| `PORT` | .env | No | `3001` | Express server port |
| `NODE_ENV` | .env | No | `development` | Affects rate limiting (100 vs 1000), error messages, Prisma logging |
| `CORS_ORIGINS` | .env | No | `http://localhost:5173,...` | Comma-separated allowed origins |

### Rate Limiting (based on NODE_ENV)

| Condition | General Limit | Auth Limit |
|-----------|--------------|------------|
| NODE_ENV=production | 100 req/15min | 10 req/15min |
| NODE_ENV=development | 1000 req/15min | 100 req/15min |

## Frontend Configuration (`frontend/.env`)

| Key | Location | Required | Default | Notes |
|-----|----------|----------|---------|-------|
| `VITE_API_URL` | .env | Yes | `http://localhost:3001/api` | Backend API base URL |

## Production Config (Railway)

| Service | Root Dir | Build Cmd | Start Cmd |
|---------|----------|-----------|-----------|
| Backend | `backend/` | `npm ci → prisma generate → npm run build` | `npm start` |
| Frontend | `frontend/` | `npm install → npm run build` | `npm start` |

## Current Git State

| Property | Value |
|----------|-------|
| Branch | `refactor/modular-monolith` |
| Baseline Tag | `baseline-pre-refactor` |
| Last Commit | `1ae80bc` — "Save latest updates for payroll system" |
| Uncommitted | `frontend/package-lock.json` (modified) |

## Database Backup Note

Production database backup should be performed via Railway dashboard or `pg_dump` before any migration or schema changes. This is documented here as a prerequisite, not executable from local development environment.
