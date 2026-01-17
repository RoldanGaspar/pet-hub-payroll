import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import branchRoutes from './routes/branch.routes';
import employeeRoutes from './routes/employee.routes';
import payrollRoutes from './routes/payroll.routes';
import incentiveRoutes from './routes/incentive.routes';
import deductionRoutes from './routes/deduction.routes';
import cashAdvanceRoutes from './routes/cashAdvance.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/deductions', deductionRoutes);
app.use('/api/cash-advances', cashAdvanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ 
          message: 'Pet Hub Payroll API is running',
          status: 'OK',
          version: '1.0.0',
          endpoints: {
                  health: '/api/health',
                  auth: '/api/auth',
                  branches: '/api/branches',
                  employees: '/api/employees',
                  payroll: '/api/payroll',
                  incentives: '/api/incentives',
                  deductions: '/api/deductions',
                  cashAdvances: '/api/cash-advances',
                  dashboard: '/api/dashboard'
                        }
              });
  });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
