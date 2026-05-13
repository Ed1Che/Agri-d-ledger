// src/modules/ledger/ledger.router.ts

import { Router } from 'express';
import { authenticate, requireScope } from '../../middleware/auth.middleware.js';
import { getLedgerEntry, verifyOnChain } from './ledger.service.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(authenticate as any);

// GET /api/v1/ledger — paginated ledger entries (REGULATOR / ADMIN)
router.get('/', requireScope('ledger:read') as any, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
    const [data, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { anchoredAt: 'desc' },
        include: { transaction: { select: { farmerId: true, buyerId: true, totalAmount: true } } },
      }),
      prisma.ledgerEntry.count(),
    ]);
    res.json({ data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) { next(err); }
});

// GET /api/v1/ledger/:transactionId
router.get('/:transactionId', requireScope('ledger:read') as any, async (req, res, next) => {
  try {
    const entry = await getLedgerEntry(req.params.transactionId);
    if (!entry) return res.status(404).json({ error: 'not_found' });
    res.json({ data: entry });
  } catch (err) { next(err); }
});

// GET /api/v1/ledger/:transactionId/verify — cross-check with Polygon
router.get('/:transactionId/verify', requireScope('ledger:read') as any, async (req, res, next) => {
  try {
    const verified = await verifyOnChain(req.params.transactionId);
    res.json({ data: { verified } });
  } catch (err) { next(err); }
});

export default router;
