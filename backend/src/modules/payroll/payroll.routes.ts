import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { PayrollService } from './payroll.service';
import { createPeriodSchema, updatePayrollSchema } from './payroll.schema';

const router = Router();
const payrollService = new PayrollService();

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

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.deletePayroll(parseInt(req.params.id as string));
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
