import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { BranchService } from './branch.service';
import { createBranchSchema, updateBranchSchema, payrollSettingsSchema, branchQuerySchema } from './branch.schema';

const router = Router();
const service = new BranchService();

// GET /branches — search, filter, sort (all authenticated users)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = branchQuerySchema.parse(req.query);
    const result = await service.getAll(query);
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// GET /branches/:id — single branch detail (all authenticated)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await service.getById(parseInt(req.params.id as string)));
  } catch (e) { next(e); }
});

// GET /branches/:id/impact — preview payroll setting changes (all authenticated)
router.get('/:id/impact', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const newSettings = req.query.workingDaysPerMonth
      ? {
          workingDaysPerMonth: parseInt(req.query.workingDaysPerMonth as string),
          workingHoursPerDay: parseInt(req.query.workingHoursPerDay as string),
        }
      : undefined;
    return res.json(await service.getImpact(parseInt(req.params.id as string), newSettings));
  } catch (e) { next(e); }
});

// POST /branches — create branch (Admin only)
router.post('/', authMiddleware, requireRole(['ADMIN']), validate(createBranchSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(201).json(await service.create(req.body));
  } catch (e) { next(e); }
});

// PUT /branches/:id — update branch info (Admin only)
router.put('/:id', authMiddleware, requireRole(['ADMIN']), validate(updateBranchSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await service.update(parseInt(req.params.id as string), req.body));
  } catch (e) { next(e); }
});

// POST /branches/:id/payroll-settings — change payroll settings (Admin only)
router.post('/:id/payroll-settings', authMiddleware, requireRole(['ADMIN']), validate(payrollSettingsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await service.updatePayrollSettings(parseInt(req.params.id as string), req.body));
  } catch (e) { next(e); }
});

// POST /branches/:id/deactivate (Admin only)
router.post('/:id/deactivate', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await service.deactivate(parseInt(req.params.id as string)));
  } catch (e) { next(e); }
});

// POST /branches/:id/reactivate (Admin only)
router.post('/:id/reactivate', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await service.reactivate(parseInt(req.params.id as string)));
  } catch (e) { next(e); }
});

export default router;
