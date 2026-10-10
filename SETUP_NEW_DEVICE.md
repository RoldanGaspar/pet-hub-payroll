# 🚀 SETUP_NEW_DEVICE.md — Guide Para sa Bagong Laptop

Ang dokumentong ito ay sunod-sunod na gabay para mai-set up at mapagana ang **Pet Hub Payroll System** sa bagong laptop nang mabilis at walang error.

---

## 1. Prerequisites (Mga Dapat Naka-install sa Bagong Laptop)

1. **Node.js**: Recommended `v18.x` o `v20.x` LTS ([nodejs.org](https://nodejs.org/))
2. **Git**: ([git-scm.com](https://git-scm.com/))
3. **PostgreSQL**: Local PostgreSQL server (v14, v15, o v16) o remote cloud PostgreSQL (Railway / Supabase / Neon / Render)
4. **VS Code / Cursor / Windsurf / Antigravity IDE**

---

## 2. Hakbang sa Pag-clone at Pag-setup

### Step 1: I-clone ang Repository
Buksan ang terminal (PowerShell / Command Prompt / Git Bash) at patakbuhin:
```bash
git clone https://github.com/RoldanGaspar/pet-hub-payroll.git
cd pet-hub-payroll
```

---

### Step 2: I-setup ang Backend

1. Pumasok sa backend folder at mag-install ng packages:
   ```bash
   cd backend
   npm install
   ```

2. Gumawa ng `.env` file sa loob ng `backend/` folder (kopyahin mula sa `.env.example`):
   ```bash
   cp .env.example .env
   ```
   *Halimbawa ng laman ng `backend/.env`:*
   ```env
   # Palitan ng totoong database credentials mo
   DATABASE_URL="postgresql://postgres:password@localhost:5432/payroll_system?schema=public"
   PORT=3001
   NODE_ENV=development
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175"
   ```

3. I-generate ang Prisma Client at Patakbuhin ang Migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
   *(Kung may existing seed script o baseline, patakbuhin din kung kinakailangan: `npx prisma db seed`)*

4. Simulan ang backend server (Development mode):
   ```bash
   npm run dev
   ```
   *Tumatakbo ito sa: `http://localhost:3001`*

---

### Step 3: I-setup ang Frontend

1. Sa panibagong terminal window, pumasok sa `frontend/` folder:
   ```bash
   cd frontend
   npm install
   ```

2. Gumawa ng `.env` file sa loob ng `frontend/` (o `.env.local`):
   ```env
   VITE_API_URL="http://localhost:3001/api"
   ```

3. Simulan ang frontend Vite development server:
   ```bash
   npm run dev
   ```
   *Tumatakbo ito sa: `http://localhost:5173`*

---

## 3. Karaniwang Troubleshooting

* **Prisma Error / Cannot connect to database**:
  * Siguraduhing running ang PostgreSQL service sa Windows (Services -> postgresql).
  * Siguraduhing tama ang username, password, at database name sa `DATABASE_URL`.
* **CORS Error sa Frontend**:
  * Siguraduhing tugma ang port ng frontend (hal. `http://localhost:5173`) sa nakalista sa `CORS_ORIGINS` sa `backend/.env`.
* **TypeScript / Path Alias Errors (`@/...`)**:
  * Ang frontend ay gumagamit ng `@/...` alias para sa `src/`. Naka-configure ito sa `vite.config.ts` at `tsconfig.json`.

---

## 4. Git Branches
* Default at updated main branch: `main`
* Feature / Refactor branch: `refactor/modular-monolith`
