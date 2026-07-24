import { Router, Response, NextFunction } from 'express';
import { adminOnly, authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { PayrollService } from './payroll.service';
import { PreflightService } from './preflight.service';
import { createPeriodSchema, payrollIdsSchema, updatePayrollSchema } from './payroll.schema';

const router = Router();
const payrollService = new PayrollService();
const preflightService = new PreflightService();

// Pre-flight check: get employee readiness info before creating a period
router.get('/preflight', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const branchId = parseInt(req.query.branchId as string);
    if (!branchId) {
      return res.status(400).json({ error: 'branchId is required' });
    }
    const result = await preflightService.getPreflight(branchId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {

  try {
    const branchId = req.query.branchId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    const result = await payrollService.getAll({
      branchId: branchId ? parseInt(branchId) : undefined,
      startDate,
      endDate,
      status,
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.getById(parseInt(req.params.id as string));
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/create-period',
  authMiddleware,
  validate(createPeriodSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await payrollService.createPeriod(req.body);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/batch/calculate', authMiddleware, validate(payrollIdsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await payrollService.calculateBatch(req.body.ids));
  } catch (error) {
    next(error);
  }
});

router.post('/batch/approve', authMiddleware, validate(payrollIdsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await payrollService.approveBatch(req.body.ids));
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  authMiddleware,
  validate(updatePayrollSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await payrollService.updatePayroll(parseInt(req.params.id as string), req.body);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/calculate', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.calculate(parseInt(req.params.id as string));
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reopen', authMiddleware, adminOnly, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await payrollService.reopenPayroll(parseInt(req.params.id as string)));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.deletePayroll(parseInt(req.params.id as string));
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
