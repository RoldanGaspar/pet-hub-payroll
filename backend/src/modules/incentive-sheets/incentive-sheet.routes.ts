import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { IncentiveSheetService } from './incentive-sheet.service';

const router = Router();
const service = new IncentiveSheetService();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    if (!branchId || !startDate || !endDate) return res.status(400).json({ error: 'branchId, startDate, and endDate are required' });
    return res.json(await service.getOrCreate(parseInt(branchId as string), startDate as string, endDate as string));
  } catch (e) { next(e); }
});

router.put('/:id/inputs', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.saveInputs(parseInt(req.params.id as string), req.body.inputs)); } catch (e) { next(e); }
});

router.post('/:id/distribute', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.distribute(parseInt(req.params.id as string))); } catch (e) { next(e); }
});

router.get('/config', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getConfig()); } catch (e) { next(e); }
});

export default router;
