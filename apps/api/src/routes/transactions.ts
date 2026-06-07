// src/routes/transactions.ts
import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { TransactionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const VALID_STATUSES = new Set(Object.values(TransactionStatus));

export const transactionsRouter = Router();

const createTxSchema = z.object({
  farmerId: z.string().uuid(),
  produceId: z.string().uuid(),
  weightKg: z.number().positive(),
  pricePerKg: z.number().positive(),
});

// POST /api/v1/transactions
transactionsRouter.post('/', requireAuth, requireRole('BUYER', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const body = createTxSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'validation_error', message: body.error.message });

    const { farmerId, produceId, weightKg, pricePerKg } = body.data;
    const totalAmount = weightKg * pricePerKg;

    const tx = await prisma.transaction.create({
      data: {
        id: randomUUID(),
        farmerId,
        buyerId: req.user!.sub,
        produceId,
        weightKg,
        pricePerKg,
        totalAmount,
        status: 'PENDING',
      },
    });

    // Mark produce as RESERVED
    await prisma.produce.update({ where: { id: produceId }, data: { status: 'RESERVED' } });

    logger.info({ event: 'transaction_created', txId: tx.id, totalAmount });
    return res.status(201).json({ data: tx });
  } catch (err) { next(err); }
});

// GET /api/v1/transactions
transactionsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const where: Record<string, unknown> = {};
    if (status) {
      if (!VALID_STATUSES.has(status as TransactionStatus)) {
        return res.status(400).json({ error: 'validation_error', message: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` });
      }
      where.status = status;
    }
    if (req.user!.role === 'FARMER') where.farmerId = req.user!.sub;
    if (req.user!.role === 'BUYER') where.buyerId = req.user!.sub;

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
      prisma.transaction.count({ where }),
    ]);
    return res.json({ data, meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) { next(err); }
});

// GET /api/v1/transactions/:id
transactionsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id as string}, include: { ledgerEntries: true } });
    if (!tx) return res.status(404).json({ error: 'not_found' });
    return res.json({ data: tx });
  } catch (err) { next(err); }
});
