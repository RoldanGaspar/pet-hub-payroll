import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { DashboardService } from './dashboard.service';

const router = Router();
const service = new DashboardService();

const parseBranchId = (req: AuthRequest) =>
  req.query.branchId ? parseInt(req.query.branchId as string) : undefined;

const parseMonth = (req: AuthRequest) =>
  req.query.month as string | undefined;

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getStats(parseBranchId(req))); } catch (e) { next(e); }
});

router.get('/payroll-summary', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getPayrollSummary(req.query.startDate as string, req.query.endDate as string, parseBranchId(req))); } catch (e) { next(e); }
});

router.get('/monthly-trend', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = req.query.months ? parseInt(req.query.months as string) : 6;
    return res.json(await service.getMonthlyTrend(months, parseBranchId(req)));
  } catch (e) { next(e); }
});

router.get('/branch-comparison', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getBranchComparison(parseMonth(req), parseBranchId(req))); } catch (e) { next(e); }
});

router.get('/financial-breakdown', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getFinancialBreakdown(parseMonth(req), parseBranchId(req))); } catch (e) { next(e); }
});

router.get('/employee-distribution', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getEmployeeDistribution(parseBranchId(req))); } catch (e) { next(e); }
});

router.get('/alerts', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getAlerts(parseBranchId(req))); } catch (e) { next(e); }
});

router.get('/payroll-calendar', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json(await service.getPayrollCalendar(req.query.month as string, req.query.year as string));
  } catch (e) { next(e); }
});

router.get('/payroll-forecast', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getPayrollForecast(parseBranchId(req))); } catch (e) { next(e); }
});

export default router;
