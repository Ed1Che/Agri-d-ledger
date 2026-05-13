// src/modules/auth/auth.router.ts

import { Router } from 'express';
import { z } from 'zod';
import {
  registerUser, loginWithPassword, initiateMfa,
  completeMfa, setupTotp, confirmTotp,
  rotateRefreshToken, revokeRefreshToken
} from './auth.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authLimiter } from '../../middleware/rateLimit.middleware.js';
import { prisma } from '../../config/database.js';
import type { AuthenticatedRequest } from '../../types/index.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const schema = z.object({
      phone:         z.string().regex(/^\+254[0-9]{9}$/),
      password:      z.string().min(8).optional(),
      role:          z.enum(['FARMER', 'BUYER', 'COOP_ADMIN']),
      cooperativeId: z.string().uuid().optional(),
      nationalId:    z.string().min(6).max(20).optional(),
    });
    const data = schema.parse(req.body);
    const user = await registerUser(data);
    res.status(201).json({ data: user });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phone, password } = z.object({
      phone:    z.string(),
      password: z.string(),
    }).parse(req.body);

    const result = await loginWithPassword(phone, password);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/mfa/initiate
router.post('/mfa/initiate', authLimiter, async (req, res, next) => {
  try {
    const { preAuthToken } = z.object({ preAuthToken: z.string() }).parse(req.body);
    const result = await initiateMfa(preAuthToken);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/mfa/verify
router.post('/mfa/verify', authLimiter, async (req, res, next) => {
  try {
    const { preAuthToken, code } = z.object({
      preAuthToken: z.string(),
      code: z.string().length(6),
    }).parse(req.body);
    const tokens = await completeMfa(preAuthToken, code);
    res.json({ data: tokens });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { userId, refreshToken } = z.object({
      userId:       z.string().uuid(),
      refreshToken: z.string(),
    }).parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tokens = await rotateRefreshToken(userId, user.role, refreshToken);
    res.json({ data: tokens });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate as any, async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    await revokeRefreshToken(userId);
    res.json({ data: { message: 'Logged out' } });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/totp/setup
router.post('/totp/setup', authenticate as any, async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    const result = await setupTotp(userId);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/totp/confirm
router.post('/totp/confirm', authenticate as any, async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    await confirmTotp(userId, code);
    res.json({ data: { mfaEnabled: true } });
  } catch (err) { next(err); }
});

export default router;
