// src/modules/audit/audit.router.ts

import { Router } from 'express';
import { authenticate, requireScope } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(authenticate as any);
router.use(requireScope('audit:read') as any);

// GET /api/v1/audit — paginated audit log
router.get('/', async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(500, parseInt(req.query.pageSize as string) || 50);
    const userId   = req.query.userId as string;
    const action   = req.query.action as string;
    const from     = req.query.from ? new Date(req.query.from as string) : undefined;
    const to       = req.query.to   ? new Date(req.query.to as string)   : undefined;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to)   where.createdAt.lte = to;
    }

    const [data, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip: (page-1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    res.json({ data, meta: { total, page, pageSize, totalPages: Math.ceil(total/pageSize) } });
  } catch (err) { next(err); }
});

// GET /api/v1/audit/stats — summary for dashboard
router.get('/stats', async (_req, res, next) => {
  try {
    const [total, byAction, recentFailures] = await Promise.all([
      prisma.auditEvent.count(),
      prisma.auditEvent.groupBy({ by: ['action'], _count: { action: true } }),
      prisma.auditEvent.findMany({
        where: { action: { in: ['MFA_FAILED', 'ACCESS_DENIED'] }, createdAt: { gte: new Date(Date.now() - 86400_000) } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    res.json({ data: { total, byAction, recentFailures } });
  } catch (err) { next(err); }
});

export default router;
