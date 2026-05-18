// src/routes/produce.ts
import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

export const produceRouter = Router();
const prisma = new PrismaClient();

const createProduceSchema = z.object({
  crop: z.string().min(1),
  gradeCode: z.enum(['AA', 'AB', 'PB', 'C']),
  weightKg: z.number().positive(),
  harvestDate: z.string(),
  county: z.string().min(2),
  cooperativeId: z.string().uuid().optional(),
  iotSensorId: z.string().optional(),
});

// GET /api/v1/produce
produceRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { crop, county, status, farmerId, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const where: Record<string, unknown> = {};
    if (crop) where.crop = { contains: crop, mode: 'insensitive' };
    if (county) where.county = { contains: county, mode: 'insensitive' };
    if (status) where.status = status;
    // Farmers only see their own produce; buyers/admins see all
    if (req.user!.role === 'FARMER') where.farmerId = req.user!.sub;
    if (farmerId && ['BUYER', 'COOP_ADMIN', 'REGULATOR', 'SUPER_ADMIN'].includes(req.user!.role)) {
      where.farmerId = farmerId;
    }

    const [data, total] = await Promise.all([
      prisma.produce.findMany({ where, skip, take: parseInt(pageSize), orderBy: { createdAt: 'desc' } }),
      prisma.produce.count({ where }),
    ]);

    return res.json({
      data,
      meta: { total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
    });
  } catch (err) { next(err); }
});

// POST /api/v1/produce
produceRouter.post('/', requireAuth, requireRole('FARMER', 'COOP_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const body = createProduceSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'validation_error', message: body.error.message });

    const produce = await prisma.produce.create({
      data: {
        id: randomUUID(),
        farmerId: req.user!.sub,
        ...body.data,
        harvestDate: new Date(body.data.harvestDate),
        status: 'AVAILABLE',
      },
    });
    return res.status(201).json({ data: produce });
  } catch (err) { next(err); }
});

// GET /api/v1/produce/:id
produceRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    // Fixed with 'as string'
    const produce = await prisma.produce.findUnique({ where: { id: req.params.id as string } });
    if (!produce) return res.status(404).json({ error: 'not_found' });
    return res.json({ data: produce });
  } catch (err) { next(err); }
});

// PATCH /api/v1/produce/:id/price
produceRouter.patch('/:id/price', requireAuth, requireRole('FARMER', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { pricePerKg } = req.body;
    if (typeof pricePerKg !== 'number' || pricePerKg <= 0) {
      return res.status(400).json({ error: 'validation_error', message: 'pricePerKg must be a positive number' });
    }
    // Fixed with 'as string'
    const updated = await prisma.produce.update({ where: { id: req.params.id as string }, data: { pricePerKg } });
    return res.json({ data: updated });
  } catch (err) { next(err); }
});
