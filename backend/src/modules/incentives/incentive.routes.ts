import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { IncentiveService } from './incentive.service';
import { createIncentiveSchema, bulkUpdateSchema, calculatePreviewSchema, updateConfigSchema } from './incentive.schema';

const router = Router();
const incentiveService = new IncentiveService();

router.get('/config', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.getConfig()); } catch (e) { next(e); }
});

router.get('/config/position/:position', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.getConfigForPosition(req.params.position as string)); } catch (e) { next(e); }
});

router.put('/config/:type', authMiddleware, requireRole(['ADMIN']), validate(updateConfigSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.updateConfig(req.params.type as string, req.body)); } catch (e) { next(e); }
});

router.post('/config/init', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.initConfig()); } catch (e) { next(e); }
});

router.get('/eligible-counts/:branchId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.getEligibleCounts(parseInt(req.params.branchId as string))); } catch (e) { next(e); }
});

router.get('/payroll/:payrollId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.getByPayroll(parseInt(req.params.payrollId as string))); } catch (e) { next(e); }
});

router.post('/', authMiddleware, validate(createIncentiveSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.create(req.body)); } catch (e) { next(e); }
});

router.put('/payroll/:payrollId/bulk', authMiddleware, validate(bulkUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.bulkUpdate(parseInt(req.params.payrollId as string), req.body.incentives)); } catch (e) { next(e); }
});

router.post('/calculate', authMiddleware, validate(calculatePreviewSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.calculatePreview(req.body.position, req.body.incentives)); } catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await incentiveService.delete(parseInt(req.params.id as string))); } catch (e) { next(e); }
});

export default router;
