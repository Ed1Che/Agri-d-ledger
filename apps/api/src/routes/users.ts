// src/routes/users.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

export const usersRouter = Router();
const prisma = new PrismaClient();

// GET /api/v1/users/me
usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, phone: true, email: true, role: true, mfaEnabled: true, cooperativeId: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'not_found' });
    return res.json({ data: user });
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/me
usersRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { email } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { email },
      select: { id: true, phone: true, email: true, role: true, mfaEnabled: true, cooperativeId: true, createdAt: true },
    });
    return res.json({ data: updated });
  } catch (err) { next(err); }
});
