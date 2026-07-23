import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { DeductionService } from './deduction.service';

const router = Router();
const service = new DeductionService();

router.get('/payroll/:payrollId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getByPayroll(parseInt(req.params.payrollId as string))); } catch (e) { next(e); }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.create(parseInt(req.body.payrollId), req.body.type, req.body.amount, req.body.notes)); } catch (e) { next(e); }
});

router.post('/bulk', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.bulkUpdate(parseInt(req.body.payrollId), req.body.deductions)); } catch (e) { next(e); }
});

router.post('/apply-fixed/:payrollId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.applyFixed(parseInt(req.params.payrollId as string))); } catch (e) { next(e); }
});

router.put('/divisor/:payrollId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.updateDivisor(parseInt(req.params.payrollId as string), req.body.divisor)); } catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.delete(parseInt(req.params.id as string))); } catch (e) { next(e); }
});

export default router;
