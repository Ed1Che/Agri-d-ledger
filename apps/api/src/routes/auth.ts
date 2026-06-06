// src/routes/auth.ts
// Authentication routes: login, register, refresh, MFA, logout
// All routes are rate-limited separately via the authLimiter below.

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT, importPKCS8 } from 'jose';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
  message: { error: 'rate_exceeded', message: 'Too many auth attempts. Try again in 15 minutes.' },
});

// ── Input schemas (Zod) ──────────────────────────────────────────────────────
const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(8),
});

const registerSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(8).optional(),
  role: z.enum(['FARMER', 'BUYER', 'COOP_ADMIN', 'REGULATOR', 'SUPER_ADMIN']),
  cooperativeId: z.string().uuid().optional(),
  nationalId: z.string().optional(),
});

// ── JWT helpers ──────────────────────────────────────────────────────────────
async function signAccessToken(userId: string, role: string, scope: string[]) {
  const rawKey = process.env.JWT_PRIVATE_KEY;
  if (!rawKey) throw new Error('JWT_PRIVATE_KEY not set');
  const pem = Buffer.from(rawKey, 'base64').toString('utf8');
  const key = await importPKCS8(pem, 'RS256');

  return new SignJWT({ sub: userId, role, scope })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(process.env.JWT_ISSUER ?? 'agridl-api')
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m')
    .sign(key);
}

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'validation_error', message: body.error.message });

    const { phone, password, role, cooperativeId, nationalId } = body.data;
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'conflict', message: 'Phone number already registered' });

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    const user = await prisma.user.create({
      data: { id: randomUUID(), phone, passwordHash, role, cooperativeId, nationalId },
    });

    return res.status(201).json({
      data: { id: user.id, phone: user.phone, role: user.role, mfaEnabled: false, createdAt: user.createdAt },
    });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'validation_error', message: body.error.message });

    const { phone, password } = body.data;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid phone or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid phone or password' });

    if (user.mfaEnabled) {
      const preAuthToken = randomUUID();
      // Store pre-auth token in Redis with 5 min TTL (implement with ioredis)
      logger.info({ event: 'mfa_initiated', userId: user.id });
      return res.json({ data: { requiresMfa: true, preAuthToken } });
    }

    const scope = [user.role.toLowerCase()];
    const accessToken = await signAccessToken(user.id, user.role, scope);
    const refreshToken = randomUUID();
    await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ event: 'login_success', userId: user.id, role: user.role });
    return res.json({ data: { requiresMfa: false, accessToken, refreshToken, scope } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { userId, refreshToken } = req.body;
    if (!userId || !refreshToken) return res.status(400).json({ error: 'validation_error' });

    const storedToken = await prisma.refreshToken.findFirst({
      where: { userId, token: refreshToken, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!storedToken) return res.status(401).json({ error: 'invalid_token' });

    const accessToken = await signAccessToken(storedToken.user.id, storedToken.user.role, [storedToken.user.role.toLowerCase()]);
    return res.json({ data: { accessToken } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────
authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });
    return res.json({ data: { ok: true } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/supabase-exchange ──────────────────────────────────────
// Accepts a Supabase access token, verifies it, auto-provisions the user in
// Prisma if needed, and returns a signed Express RS256 JWT.
authRouter.post('/supabase-exchange', authLimiter, async (req, res, next) => {
  try {
    const { supabaseAccessToken } = req.body;
    if (!supabaseAccessToken) return res.status(400).json({ error: 'missing_token' });

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseAccessToken);
    if (error || !user) return res.status(401).json({ error: 'invalid_supabase_token' });

    let dbUser = await prisma.user.findFirst({ where: { email: user.email } });
    if (!dbUser) {
      const role = (user.user_metadata?.user_type ?? 'FARMER').toUpperCase();
      dbUser = await prisma.user.create({
        data: {
          id: randomUUID(),
          phone: user.phone ?? user.email ?? user.id,
          email: user.email,
          role: role as any,
          passwordHash: '',
        },
      });
    }

    const accessToken = await signAccessToken(dbUser.id, dbUser.role, [dbUser.role.toLowerCase()]);
    logger.info({ event: 'supabase_exchange', userId: dbUser.id });
    return res.json({ data: { accessToken } });
  } catch (err) { next(err); }
});
