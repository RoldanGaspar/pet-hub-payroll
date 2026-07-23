import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../shared/middleware/auth.middleware';
import { BranchService } from './branch.service';

const router = Router();
const service = new BranchService();

router.get('/', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getAll()); } catch (e) { next(e); }
});
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getById(parseInt(req.params.id as string))); } catch (e) { next(e); }
});
router.post('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.status(201).json(await service.create(req.body)); } catch (e) { next(e); }
});
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.update(parseInt(req.params.id as string), req.body)); } catch (e) { next(e); }
});
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.softDelete(parseInt(req.params.id as string))); } catch (e) { next(e); }
});

export default router;
