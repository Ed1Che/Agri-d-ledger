// src/modules/produce/produce.router.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireScope } from '../../middleware/auth.middleware.js';
import { createProduce, listProduce, getProduce, updateProducePrice } from './produce.service.js';
import type { AuthenticatedRequest } from '../../types/index.js';

const router = Router();
router.use(authenticate as any);

router.post('/', requireScope('produce:write') as any, async (req, res, next) => {
  try {
    const schema = z.object({
      crop:         z.string().min(2).max(50),
      gradeCode:    z.string().min(1).max(10),
      weightKg:     z.number().positive().max(100_000),
      harvestDate:  z.string().datetime(),
      county:       z.string().min(2),
      cooperativeId: z.string().uuid().optional(),
      iotSensorId:   z.string().optional(),
    });
    const data = schema.parse(req.body);
    const farmerId = (req as AuthenticatedRequest).user.sub;
    const produce = await createProduce({ ...data, farmerId, harvestDate: new Date(data.harvestDate) });
    res.status(201).json({ data: produce });
  } catch (err) { next(err); }
});

router.get('/', requireScope('produce:read') as any, async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
    const result = await listProduce({
      county:  req.query.county as string,
      crop:    req.query.crop as string,
      status:  req.query.status as string,
      farmerId: req.query.farmerId as string,
      page, pageSize,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', requireScope('produce:read') as any, async (req, res, next) => {
  try {
    const produce = await getProduce(req.params.id);
    res.json({ data: produce });
  } catch (err) { next(err); }
});

router.patch('/:id/price', requireScope('produce:write') as any, async (req, res, next) => {
  try {
    const { pricePerKg } = z.object({ pricePerKg: z.number().positive() }).parse(req.body);
    const farmerId = (req as AuthenticatedRequest).user.sub;
    const produce = await updateProducePrice(req.params.id, farmerId, pricePerKg);
    res.json({ data: produce });
  } catch (err) { next(err); }
});

export default router;
