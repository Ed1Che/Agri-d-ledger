// src/modules/users/users.router.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireScope, requireRole } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import type { AuthenticatedRequest } from '../../types/index.js';

const router = Router();
router.use(authenticate as any);

// GET /api/v1/users/me
router.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: (req as AuthenticatedRequest).user.sub },
      select: { id: true, phone: true, email: true, role: true, mfaEnabled: true,
                cooperativeId: true, createdAt: true },
    });
    res.json({ data: user });
  } catch (err) { next(err); }
});

// GET /api/v1/users — admin only
router.get('/', requireScope('users:read') as any, async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
    const role     = req.query.role as string;
    const where: any = {};
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where, skip: (page-1)*pageSize, take: pageSize,
        select: { id: true, phone: true, role: true, active: true, cooperativeId: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ data, meta: { total, page, pageSize, totalPages: Math.ceil(total/pageSize) } });
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/me
router.patch('/me', async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email().optional() });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: (req as AuthenticatedRequest).user.sub },
      data,
      select: { id: true, phone: true, email: true, role: true },
    });
    res.json({ data: user });
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/:id/deactivate — super admin
router.patch('/:id/deactivate', requireRole('SUPER_ADMIN') as any, async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ data: { message: 'User deactivated' } });
  } catch (err) { next(err); }
});

export default router;
