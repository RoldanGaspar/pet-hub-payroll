import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../../shared/middleware/auth.middleware';
import { EmployeeService } from './employee.service';

const router = Router();
const service = new EmployeeService();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = {
      branchId: req.query.branchId ? parseInt(req.query.branchId as string) : undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      position: req.query.position as string | undefined,
    };
    return res.json(await service.getAll(query));
  } catch (e) { next(e); }
});
router.get('/formula/:position', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getFormulaInfo(req.params.position as any, req.query.method as string | undefined)); } catch (e) { next(e); }
});
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getById(parseInt(req.params.id as string))); } catch (e) { next(e); }
});
router.get('/:id/fixed-deductions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getFixedDeductions(parseInt(req.params.id as string))); } catch (e) { next(e); }
});
router.get('/:id/incentive-exclusions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.getExclusions(parseInt(req.params.id as string))); } catch (e) { next(e); }
});
router.post('/', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.status(201).json(await service.create(req.body)); } catch (e) { next(e); }
});
router.put('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.update(parseInt(req.params.id as string), req.body)); } catch (e) { next(e); }
});
router.put('/:id/fixed-deductions', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.updateFixedDeductions(parseInt(req.params.id as string), req.body.deductions)); } catch (e) { next(e); }
});
router.post('/:id/recalculate-rates', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.recalculateRates(parseInt(req.params.id as string))); } catch (e) { next(e); }
});
router.post('/:id/incentive-exclusions', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.toggleExclusion(parseInt(req.params.id as string), req.body.incentiveType)); } catch (e) { next(e); }
});
router.delete('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return res.json(await service.softDelete(parseInt(req.params.id as string))); } catch (e) { next(e); }
});

export default router;
