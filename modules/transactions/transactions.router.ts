// src/modules/transactions/transactions.router.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireScope } from '../../middleware/auth.middleware.js';
import { createTransaction, getTransaction, listTransactions } from './transactions.service.js';
import type { AuthenticatedRequest } from '../../types/index.js';

const router = Router();
router.use(authenticate as any);

// POST /api/v1/transactions
router.post('/', requireScope('tx:write') as any, async (req, res, next) => {
  try {
    const schema = z.object({
      farmerId:   z.string().uuid(),
      produceId:  z.string().uuid(),
      weightKg:   z.number().positive().max(100_000),
      pricePerKg: z.number().positive().max(10_000),
    });
    const data = schema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    const tx = await createTransaction({ ...data, buyerId: user.sub });
    res.status(201).json({ data: tx });
  } catch (err) { next(err); }
});

// GET /api/v1/transactions
router.get('/', requireScope('tx:read') as any, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
    const status   = req.query.status as string | undefined;
    const result = await listTransactions({ userId: user.sub, role: user.role, page, pageSize, status });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/v1/transactions/:id
router.get('/:id', requireScope('tx:read') as any, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const tx = await getTransaction(req.params.id, user.sub, user.role);
    res.json({ data: tx });
  } catch (err) { next(err); }
});

export default router;
