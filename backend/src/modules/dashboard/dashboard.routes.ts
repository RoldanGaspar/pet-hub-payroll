import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { DashboardService } from './dashboard.service';

const router = Router();
const service = new DashboardService();

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getStats(req.query.branchId ? parseInt(req.query.branchId as string) : undefined)); } catch (e) { next(e); }
});
router.get('/payroll-summary', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getPayrollSummary(req.query.startDate as string, req.query.endDate as string, req.query.branchId ? parseInt(req.query.branchId as string) : undefined)); } catch (e) { next(e); }
});

export default router;
