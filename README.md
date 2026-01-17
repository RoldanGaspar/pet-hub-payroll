# Pet Hub Payroll System

A comprehensive web-based payroll management system for Pet Hub Veterinary Clinics. Manage employees, calculate payroll, track incentives, and generate payslips across all 8 branches.

## Features

- **Multi-Branch Support**: Manage payroll for 8+ branches (Angeles, Bacoor, Baliwag, Bataan, Lancaster, Las Pinas, Paranaque, Trading)
- **Employee Management**: Full CRUD for employees with position-based calculations
- **Real-time Payroll Calculator**: 
  - Auto-calculate Rate/Day and Rate/Hour from salary
  - Basic Pay, Holiday Pay, Overtime calculations
  - Position-specific incentives (Veterinarians, Groomers, Trading Staff)
  - Government deductions (SSS, PhilHealth, Pag-IBIG)
- **Cash Advance Tracking**: Record and track employee cash advances
- **Payslip Generation**: Print-ready payslips matching Excel format
- **Dashboard**: Overview of all branches with statistics

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | TailwindCSS |
| State | TanStack Query |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd pet-hub-payroll

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Database

Create a PostgreSQL database:

```sql
CREATE DATABASE payroll_system;
```

Update the database URL in `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/payroll_system?schema=public"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

### 3. Run Database Migrations

```bash
cd backend
npx prisma db push
```

### 4. Seed Initial Data

```bash
npm run db:seed
```

This creates:
- Admin user (admin@pethub.com / admin123)
- 8 Pet Hub branches
- Sample employees for Angeles branch

### 5. Start the Application

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

### 6. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

**Login Credentials:**
- Email: admin@pethub.com
- Password: admin123

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET/POST | `/api/branches` | Branch management |
| GET/POST | `/api/employees` | Employee management |
| POST | `/api/payroll/create-period` | Create payroll period |
| PUT | `/api/payroll/:id` | Update payroll |
| POST | `/api/payroll/:id/calculate` | Recalculate payroll |
| GET/POST | `/api/incentives` | Incentive management |
| GET/POST | `/api/deductions` | Deduction management |
| GET/POST | `/api/cash-advances` | Cash advance tracking |
| GET | `/api/dashboard/stats` | Dashboard statistics |

## Payroll Calculations

### Basic Pay
```
Basic Pay = Rate/Day × Total Days Present
Rate/Day = Monthly Salary / 26
Rate/Hour = Rate/Day / 8
```

### Holiday Pay
```
Holiday Pay = Rate/Day × Holiday Rate × Number of Holidays
```

### Overtime Pay
```
Overtime Pay = Rate/Hour × 1.25 × OT Hours
```

### Net Pay
```
Gross Pay = Basic Pay + Holiday Pay + OT Pay + Incentives + Allowances
Net Pay = Gross Pay - Deductions
```

## Position-Based Incentives

| Veterinarians | Groomers/Staff | Trading |
|---------------|----------------|---------|
| CBC | Grooming | TK 100% |
| Blood Chem | Surgery | TK 90% |
| Ultrasound | Emergency | Meds 100% |
| Test Kits | Nursing | Meds 90% |
| Surgery | Confinement | |
| Emergency | | |
| X-Ray | | |
| Confinement | | |

## Project Structure

```
pet-hub-payroll/
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   └── utils/           # Helpers & Prisma client
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # Auth context
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # API client & helpers
│   └── package.json
└── README.md
```

## License

Private - Pet Hub Philippines Corporation
