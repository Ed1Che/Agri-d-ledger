// src/modules/transactions/transactions.service.ts

import { createHash } from 'crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { anchorQueue } from '../../queues/anchor.queue.js';
import { transactionCounter } from '../../config/metrics.js';

export async function createTransaction(data: {
  farmerId: string;
  buyerId:  string;
  produceId: string;
  weightKg:  number;
  pricePerKg: number;
}) {
  // Validate produce exists and is available
  const produce = await prisma.produce.findUniqueOrThrow({ where: { id: data.produceId } });
  if (produce.status !== 'AVAILABLE') {
    throw new AppError('conflict', 409, 'Produce is not available for sale');
  }
  if (produce.farmerId !== data.farmerId) {
    throw new AppError('forbidden', 403, 'Produce does not belong to this farmer');
  }

  const totalAmount = +(data.weightKg * data.pricePerKg).toFixed(2);

  const tx = await prisma.$transaction(async (trx) => {
    const transaction = await trx.transaction.create({
      data: {
        farmerId:   data.farmerId,
        buyerId:    data.buyerId,
        produceId:  data.produceId,
        weightKg:   data.weightKg,
        pricePerKg: data.pricePerKg,
        totalAmount,
        status: 'PENDING',
      },
    });

    await trx.produce.update({
      where: { id: data.produceId },
      data:  { status: 'RESERVED' },
    });

    return transaction;
  });

  // Queue blockchain anchoring (async — does not block response)
  const dataHash = createHash('keccak256')
    .update(JSON.stringify({ id: tx.id, farmerId: tx.farmerId, buyerId: tx.buyerId, totalAmount }))
    .digest('hex');

  await anchorQueue.add('anchorTransaction', {
    transactionId: tx.id,
    dataHash,
  }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

  transactionCounter.inc({ status: 'pending' });
  return tx;
}

export async function getTransaction(id: string, requestingUserId: string, role: string) {
  const tx = await prisma.transaction.findUniqueOrThrow({
    where: { id },
    include: { produce: true, ledgerEntry: true, zkpProof: true },
  });

  if (role !== 'SUPER_ADMIN' && role !== 'REGULATOR') {
    if (tx.farmerId !== requestingUserId && tx.buyerId !== requestingUserId) {
      throw new AppError('forbidden', 403, 'Access denied');
    }
  }

  return tx;
}

export async function listTransactions(params: {
  userId: string;
  role:   string;
  page:   number;
  pageSize: number;
  status?: string;
}) {
  const { userId, role, page, pageSize, status } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (!['SUPER_ADMIN', 'REGULATOR', 'COOP_ADMIN'].includes(role)) {
    where.OR = [{ farmerId: userId }, { buyerId: userId }];
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { produce: { select: { crop: true, gradeCode: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
}
