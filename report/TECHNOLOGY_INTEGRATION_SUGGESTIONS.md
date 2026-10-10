# Pet Hub Payroll System — Technology Integration Suggestions

> **Date**: 2026-07-25
> **Criteria**: Open-source, free tier available, self-hostable, compatible with the existing stack (React/Express/Prisma/PostgreSQL)

---

## 1. Authentication & Authorization

| Library | Purpose | Why |
|---|---|---|
| **[Clerk](https://clerk.com)** | Auth as a service | Free tier (10K MAU), React/Express SDK, MFA built-in. Replaces manual JWT handling. |
| **[Lucia Auth](https://lucia-auth.com)** | Auth library | Fully open-source, session-based or JWT, Prisma adapter. More control than Clerk. |
| **[CASL](https://casl.js.org)** | Authorization | Declarative ability-based permissions (`can('manage', 'Branch')`). Works with React + Express. Much more flexible than current role string checks. |
| **[AccessControl](https://onury.io/accesscontrol)** | RBAC/ABAC | Granular role-permission grants with hierarchical roles. |

**Recommendation**: CASL — zero friction, replaces inline `user.role === 'ADMIN'` checks with declarative abilities.

---

## 2. API Documentation

| Library | Purpose | Why |
|---|---|---|
| **[Scalar](https://scalar.com)** | API docs UI | Open-source, modern OpenAPI renderer. Better UX than Swagger UI. |
| **[swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)** | JSDoc → OpenAPI | Annotate routes with JSDoc comments, auto-generate OpenAPI spec. |
| **[Zod to OpenAPI](https://github.com/samchungy/zod-openapi)** | Zod → OpenAPI | Converts existing Zod schemas directly to OpenAPI schema. Zero duplication. |

**Recommendation**: Zod to OpenAPI + Scalar — you already have Zod schemas; derive API docs from them automatically.

---

## 3. UI Component Libraries

| Library | Purpose | Why |
|---|---|---|
| **[shadcn/ui](https://ui.shadcn.com)** | Component collection | Copy-paste components (not a dependency), built on Radix + Tailwind. Matches your existing Tailwind setup perfectly. |
| **[Radix UI](https://radix-ui.com)** | Headless primitives | Accessible, unstyled primitives. You already use Radix patterns (modals). |
| **[TanStack Table](https://tanstack.com/table)** | Data tables | You have tables everywhere (Payroll, Employees, CashAdvances). This adds sorting, pagination, filtering, column resizing, virtualization. |
| **[Tremor](https://tremor.so)** | Dashboard components | Chart and dashboard blocks (KPI cards, bar charts, area charts). Built on Tailwind. |
| **[Recharts](https://recharts.org)** | Charts | Composable React charting. Line/bar/pie charts for dashboard analytics. |
| **[Lucide React](https://lucide.dev)** | Icons | Already in use — good choice. |

**Recommendation**: shadcn/ui (table, dialog, select, toast replacements) + Recharts (dashboard charts) + TanStack Table (server-side pagination).

---

## 4. Forms & Validation

| Library | Purpose | Why |
|---|---|---|
| **[React Hook Form](https://react-hook-form.com)** | Form management | Already in use — good. |
| **[Zod](https://zod.dev)** | Validation | Already in use on both backend and frontend. |
| **[TanStack Form](https://tanstack.com/form)** | Form state | Alternative to RHF, same ecosystem as React Query. |

---

## 5. State Management & Data Fetching

| Library | Purpose | Why |
|---|---|---|
| **[TanStack Query](https://tanstack.com/query)** | Server state | Already in use. |
| **[Zustand](https://zustand-demo.pmnd.rs)** | Client state | Minimal global state for UI concerns (sidebar collapsed, view prefs). Simpler than Redux. |
| **[Jotai](https://jotai.org)** | Atomic state | Alternative to Zustand — atomic state model. |

**Recommendation**: Zustand for UI-only state (view preferences, sidebar state).

---

## 6. Database & ORM

| Library | Purpose | Why |
|---|---|---|
| **[Prisma](https://prisma.io)** | ORM | Already in use. Consider upgrading to Prisma 7+ for better performance. |
| **[Drizzle ORM](https://orm.drizzle.team)** | Lightweight ORM | SQL-like API, zero runtime overhead, smaller bundle. Alternative if Prisma feels too heavy. |
| **[pgBouncer](https://www.pgbouncer.org)** | Connection pooling | Essential for production — prevents connection exhaustion. Works with Prisma's connection pool. |
| **[Prisma Pulse](https://www.prisma.io/pulse)** | Real-time DB events | Real-time updates when payroll records change (paid tier, but worth mentioning). |

**Recommendation**: pgBouncer for production connection pooling (your Prisma singleton already reduces connections, but pgBouncer is the proper solution for scale).

---

## 7. Search

| Library | Purpose | Why |
|---|---|---|
| **[Pgvector](https://github.com/pgvector/pgvector)** | Vector search | PostgreSQL extension for similarity search. |
| **[Meilisearch](https://www.meilisearch.com)** | Full-text search | Self-hosted, typo-tolerant, instant search. Replaces slow `contains` queries. Docker image. |
| **[Typesense](https://typesense.org)** | Full-text search | Alternative to Meilisearch. Self-hosted, fast, open-source. |
| **[Prisma full-text](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search)** | PostgreSQL FTS | PostgreSQL's built-in `tsvector` via Prisma. No extra infrastructure. |

**Recommendation**: Meilisearch — self-host with Docker, instant typo-tolerant search across employees, payrolls, branches.

---

## 8. Caching & Performance

| Library | Purpose | Why |
|---|---|---|
| **[Redis](https://redis.io)** | In-memory cache | Cache dashboard stats, branch lists, employee lookups. Reduces DB load. |
| **[ioredis](https://github.com/redis/ioredis)** | Redis client | Robust Node.js Redis client. |
| **[lru-cache](https://github.com/isaacs/node-lru-cache)** | In-process cache | Simpler than Redis — in-memory LRU cache for single-server setups. |
| **[Prisma Accelerate](https://www.prisma.io/accelerate)** | Connection pooling + caching | Cloud-hosted (paid tier). |

**Recommendation**: Redis via ioredis — cache dashboard aggregation queries and branch lists (they don't change frequently).

---

## 9. Background Jobs & Queues

| Library | Purpose | Why |
|---|---|---|
| **[BullMQ](https://bullmq.io)** | Job queue (Redis) | Process payroll calculations, email sends, report generation as background jobs. Prevents request timeouts. |
| **[Bull Board](https://github.com/felixmosh/bull-board)** | Job monitoring UI | Web dashboard to view/monitor BullMQ queues. |
| **[node-cron](https://github.com/node-cron/node-cron)** | Cron scheduler | Schedule recurring tasks (e.g., auto-create payroll periods for semi-monthly). |
| **[Trigger.dev](https://trigger.dev)** | Background jobs | Open-source, durable execution, TypeScript-native. Alternative to BullMQ. |

**Recommendation**: BullMQ + Bull Board — payroll recalculation is already heavy (loops over employees synchronously); queueing would prevent timeouts.

---

## 10. Email & Notifications

| Library | Purpose | Why |
|---|---|---|
| **[Nodemailer](https://nodemailer.com)** | Email sending | The standard. SMTP, SendGrid, Mailgun transports. |
| **[React Email](https://react.email)** | Email templates | Build emails with React components. Preview in dev. |
| **[Novu](https://novu.co)** | Notification infra | Open-source, multi-channel (email, SMS, in-app). Notification center widget. |
| **[Resend](https://resend.com)** | Email API | Free tier (100 emails/day). Modern email API. |

**Recommendation**: Nodemailer + React Email — send payslip PDFs, payroll approval notifications.

---

## 11. PDF & Document Generation

| Library | Purpose | Why |
|---|---|---|
| **[react-to-print](https://github.com/MatthewHerbst/react-to-print)** | Print React components | Already in use for payslips — good. |
| **[jsPDF](https://github.com/parallax/jsPDF)** | Client-side PDF | Programmatic PDF generation without print dialog. |
| **[Puppeteer](https://pptr.dev)** | Headless Chrome | Server-side PDF generation from HTML. Best quality but heavier. |
| **[Gotenberg](https://gotenberg.dev)** | PDF microservice | Docker-based, converts HTML/Markdown/Office to PDF. REST API. |
| **[pdf-lib](https://pdf-lib.js.org)** | PDF manipulation | Create/modify PDFs programmatically. Merge payslips into a single PDF. |

**Recommendation**: pdf-lib for merging batch payslips into one PDF programmatically.

---

## 12. Monitoring & Observability

| Library | Purpose | Why |
|---|---|---|
| **[Winston](https://github.com/winstonjs/winston)** | Logging | Already in use. |
| **[Pino](https://getpino.io)** | Fast logging | 5x faster than Winston. JSON-first. Better for production. |
| **[Sentry](https://sentry.io)** | Error tracking | Free tier (5K errors/month). Self-hostable version available. |
| **[OpenTelemetry](https://opentelemetry.io)** | Tracing/Metrics | Industry standard. Trace requests across services. |
| **[Prometheus + Grafana](https://prometheus.io)** | Metrics + dashboards | Self-hosted. Monitor API latency, DB connections, error rates. |
| **[Better Stack](https://betterstack.com)** | Logs + uptime | Free tier. Log tailing + uptime monitoring. |
| **[Highlight.io](https://www.highlight.io)** | Session replay | Open-source. Record user sessions for debugging. |

**Recommendation**: Pino (replace Winston) + Sentry (error tracking, self-hosted).

---

## 13. CI/CD & DevOps

| Library | Purpose | Why |
|---|---|---|
| **[GitHub Actions](https://github.com/features/actions)** | CI/CD | Already using. |
| **[Docker Compose](https://docs.docker.com/compose)** | Local dev env | Single `docker compose up` for PostgreSQL + Redis + Meilisearch + app. |
| **[Nixpacks](https://nixpacks.com)** | Builds | Already using via Railway. |
| **[Act](https://github.com/nektos/act)** | Local Actions | Run GitHub Actions locally before pushing. |
| **[Dependabot](https://github.com/dependabot)** | Dependency updates | Auto PRs for outdated packages. |

**Recommendation**: Docker Compose for reproducible local dev environment.

---

## 14. Security

| Library | Purpose | Why |
|---|---|---|
| **[Helmet](https://helmetjs.github.io)** | HTTP headers | Already in use — good. |
| **[express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)** | Rate limiting | Already in use. |
| **[Arcjet](https://arcjet.com)** | Security SDK | Bot detection, rate limiting, shield. Free tier (10K requests/month). |
| **[OWASP ZAP](https://www.zaproxy.org)** | Security testing | Automated security scanning in CI/CD. |
| **[Trivy](https://trivy.dev)** | Vulnerability scanning | Scan Docker images and dependencies for CVEs. |
| **[Husky](https://typicode.github.io/husky)** | Git hooks | Pre-commit: lint, typecheck, test. Prevent bad commits. |
| **[lint-staged](https://github.com/lint-staged/lint-staged)** | Staged file linting | Run eslint/prettier only on staged files. |

**Recommendation**: Husky + lint-staged (prevent pushing broken code) + OWASP ZAP in CI (security scan).

---

## 15. Audit Logging

| Library | Purpose | Why |
|---|---|---|
| **[Prisma Audit](https://github.com/albingroen/prisma-audit-trail)** | DB audit trail | Auto-records create/update/delete on Prisma models. |
| **[audit-log](https://github.com/salesforce/audit-log)** | Activity logging | Structured audit records for compliance. |
| **[Event Sourcing (custom)** | Full audit history | Store every state change as an event. Complex but complete. |

**Recommendation**: prisma-audit-trail — minimal setup, records changes to all models automatically.

---

## 16. Testing

| Library | Purpose | Why |
|---|---|---|
| **[Vitest](https://vitest.dev)** | Unit/Integration tests | Already in use. |
| **[Playwright](https://playwright.dev)** | E2E tests | Test the full app in real browsers. Much better than Cypress. |
| **[MSW (Mock Service Worker)](https://mswjs.io)** | API mocking | Mock API responses in tests and development. |
| **[Faker.js](https://fakerjs.dev)** | Test data | Generate realistic fake data for tests. |
| **[Testing Library](https://testing-library.com)** | Component tests | Already available via React Testing Library. |

**Recommendation**: Playwright for E2E tests + Faker.js for test data generation.

---

## 17. Internationalization (i18n)

| Library | Purpose | Why |
|---|---|---|
| **[react-i18next](https://react.i18next.com)** | React i18n | Standard. Works with React, namespaces, lazy loading. |
| **[FormatJS](https://formatjs.io)** | i18n | ICU message format. Better plural/number formatting. |
| **[Tolgee](https://tolgee.io)** | Translation platform | Open-source, in-context editing, auto-translation. |

**Recommendation**: react-i18next — only if PHPS expands to non-English branches.

---

## 18. Rate Calculation & Financial Precision

| Library | Purpose | Why |
|---|---|---|
| **[decimal.js](https://github.com/MikeMcl/decimal.js)** | Arbitrary precision | Replace `Number()` conversions. Eliminates floating-point errors in payroll. |
| **[dinero.js](https://dinerojs.com)** | Money handling | Immutable monetary values, currency formatting, allocation/distribution. |
| **[big.js](https://github.com/MikeMcl/big.js)** | Precise math | Smaller alternative to decimal.js for simple arithmetic. |

**Recommendation**: dinero.js — built for financial apps. Replace raw `Number()` conversions and `MonetaryRules` with proper monetary types.

---

## 19. File Upload & Storage

| Library | Purpose | Why |
|---|---|---|
| **[Multer](https://github.com/expressjs/multer)** | File uploads | Standard Express middleware for multipart uploads. |
| **[MinIO](https://min.io)** | S3-compatible storage | Self-hosted object storage. Store payslip PDFs, employee documents. |
| **[Cloudflare R2](https://www.cloudflare.com/r2)** | Object storage | Free tier (10GB). S3-compatible, no egress fees. |

**Recommendation**: MinIO if self-hosting, R2 if using cloud.

---

## 20. Workflow & Automation

| Library | Purpose | Why |
|---|---|---|
| **[n8n](https://n8n.io)** | Workflow automation | Self-hosted, connects 300+ apps. Auto-create payroll periods, send notification emails. |
| **[Temporal](https://temporal.io)** | Durable execution | Complex workflows with retries. Payroll period lifecycle management. |
| **[Inngest](https://www.inngest.com)** | Event-driven workflows | Write workflow functions, durable execution, built-in retries. |

**Recommendation**: n8n — visual workflow builder, easier than code-only solutions for business automation.

---

## Priority Recommendations (Top 10)

| # | Technology | Category | Impact | Effort |
|---|---|---|---|---|
| 1 | **dinero.js** | Financial precision | High | S |
| 2 | **CASL** | Authorization | High | M |
| 3 | **shadcn/ui** | UI components | High | M |
| 4 | **Recharts** | Dashboard charts | High | M |
| 5 | **Husky + lint-staged** | Code quality | Medium | S |
| 6 | **Pino** | Logging | Medium | S |
| 7 | **BullMQ + Bull Board** | Background jobs | High | M |
| 8 | **Docker Compose** | Dev environment | Medium | M |
| 9 | **Meilisearch** | Full-text search | Medium | L |
| 10 | **Meilisearch** | Full-text search | Medium | L |
| 10 | **Playwright** | E2E testing | Medium | M |
| 11 | **Redis** | Caching | Medium | M |
| 12 | **Prisma Audit Trail** | Audit logging | High | S |

---

## Quick Wins (Under 1 Hour Each)

| # | Technology | What it replaces/fixes |
|---|---|---|
| 1 | **dinero.js** | Replace `Number()` conversions with precise money math |
| 2 | **Husky + lint-staged** | Pre-commit hooks for lint + typecheck |
| 3 | **Pino** | 5x faster logging than Winston |
| 4 | **Prisma Audit Trail** | Automatic change tracking on all models |
| 5 | **CASL** | Replace role string checks with declarative abilities |
| 6 | **Docker Compose** | One command to spin up PostgreSQL + Redis + app |

---

*This is a reference catalog. Pick technologies based on actual pain points and priorities.*
