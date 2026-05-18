// src/routes/ledger.ts
import { Router } from 'express';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

export const ledgerRouter = Router();
const prisma = new PrismaClient();

// GET /api/v1/ledger
ledgerRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [data, total] = await Promise.all([
      prisma.ledgerEntry.findMany({ skip, take: parseInt(pageSize), orderBy: { anchoredAt: 'desc' } }),
      prisma.ledgerEntry.count(),
    ]);
    return res.json({ data, meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) { next(err); }
});

// GET /api/v1/ledger/:transactionId/verify
ledgerRouter.get('/:transactionId/verify', requireAuth, async (req, res, next) => {
  try {
    const transactionId = Array.isArray(req.params.transactionId) ? req.params.transactionId[0] : req.params.transactionId;
    const entry = await prisma.ledgerEntry.findFirst({
      where: { transactionId },
      include: { transaction: true },
    });
    if (!entry) return res.status(404).json({ error: 'not_found', message: 'No ledger entry for this transaction' });

    // Recompute hash and compare
    const recomputed = createHash('sha256')
      .update(JSON.stringify({ transactionId: entry.transactionId }))
      .digest('hex');
    const verified = recomputed === entry.dataHash;

    return res.json({ data: { verified, onChainHash: entry.onChainHash, blockNumber: entry.blockNumber } });
  } catch (err) { next(err); }
});
