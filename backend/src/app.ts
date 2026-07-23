import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import branchRoutes from './routes/branch.routes';
import employeeRoutes from './routes/employee.routes';
import payrollRoutes from './routes/payroll.routes';
import incentiveRoutes from './routes/incentive.routes';
import incentiveSheetRoutes from './routes/incentive-sheet.routes';
import deductionRoutes from './routes/deduction.routes';
import cashAdvanceRoutes from './routes/cashAdvance.routes';
import dashboardRoutes from './routes/dashboard.routes';
import prisma from './utils/prisma';
import { errorHandler } from './shared/middleware/error.middleware';

export function createApp() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Security: Helmet for HTTP headers
  app.use(helmet());

  // Security: CORS configuration
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // Security: Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(express.json({ limit: '10mb' }));

  // Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/branches', branchRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/payroll', payrollRoutes);
  app.use('/api/incentives', incentiveRoutes);
  app.use('/api/incentive-sheets', incentiveSheetRoutes);
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
  app.get('/api/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection failed'
      });
    }
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
