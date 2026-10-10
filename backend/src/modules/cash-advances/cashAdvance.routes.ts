import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../../shared/middleware/auth.middleware';
import { CashAdvanceService } from './cashAdvance.service';

const router = Router();
const service = new CashAdvanceService();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = {
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined,
      isPaid: req.query.isPaid !== undefined ? req.query.isPaid === 'true' : undefined,
      search: req.query.search as string | undefined,
      branchId: req.query.branchId ? parseInt(req.query.branchId as string) : undefined,
    };
    return res.json(await service.getAll(query));
  } catch (e) { next(e); }
});
router.get('/employee/:employeeId/unpaid', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getUnpaid(parseInt(req.params.employeeId as string))); } catch (e) { next(e); }
});
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getById(parseInt(req.params.id as string))); } catch (e) { next(e); }
});
router.post('/', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.status(201).json(await service.create(parseInt(req.body.employeeId), parseFloat(req.body.amount), req.body.dateTaken, req.body.notes)); } catch (e) { next(e); }
});
router.put('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.update(parseInt(req.params.id as string), req.body)); } catch (e) { next(e); }
});
router.post('/:id/mark-paid', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.markPaid(parseInt(req.params.id as string), req.body.payrollId ? parseInt(req.body.payrollId) : undefined)); } catch (e) { next(e); }
});
router.delete('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.delete(parseInt(req.params.id as string))); } catch (e) { next(e); }
});

export default router;
