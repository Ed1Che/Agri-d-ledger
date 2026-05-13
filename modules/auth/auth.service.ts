// src/modules/auth/auth.service.ts — authentication business logic

import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../middleware/error.middleware.js';
import { issueTokenPair, storeRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../../utils/jwt.js';
import { sendOTP } from '../ussd/otp.service.js';
import { authAttempts } from '../../config/metrics.js';
import type { Role } from '@prisma/client';

const OTP_TTL_SECONDS = 300; // 5 minutes

export async function registerUser(data: {
  phone: string;
  password?: string;
  role: Role;
  cooperativeId?: string;
  nationalId?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) throw new AppError('conflict', 409, 'Phone number already registered');

  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : null;

  const nationalIdHash = data.nationalId
    ? createHash('sha256').update(data.nationalId).digest('hex')
    : null;

  const user = await prisma.user.create({
    data: {
      phone:         data.phone,
      passwordHash,
      nationalIdHash,
      role:          data.role,
      cooperativeId: data.cooperativeId ?? null,
    },
    select: { id: true, phone: true, role: true, createdAt: true },
  });

  logger.info('User registered', { userId: user.id, role: user.role });
  return user;
}

export async function loginWithPassword(phone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user?.passwordHash) {
    authAttempts.inc({ method: 'password', outcome: 'fail' });
    throw new AppError('invalid_credentials', 401, 'Invalid phone or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    authAttempts.inc({ method: 'password', outcome: 'fail' });
    throw new AppError('invalid_credentials', 401, 'Invalid phone or password');
  }

  if (user.mfaEnabled) {
    // Require MFA — issue a short-lived pre-auth token
    const preAuthToken = randomBytes(32).toString('hex');
    await redis.set(`preauth:${preAuthToken}`, user.id, 'EX', 300);
    authAttempts.inc({ method: 'password', outcome: 'mfa_required' });
    return { requiresMfa: true, preAuthToken };
  }

  const { accessToken, refreshToken, scope } = issueTokenPair(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);
  authAttempts.inc({ method: 'password', outcome: 'success' });
  return { accessToken, refreshToken, scope, requiresMfa: false };
}

export async function initiateMfa(preAuthToken: string) {
  const userId = await redis.get(`preauth:${preAuthToken}`);
  if (!userId) throw new AppError('invalid_token', 401, 'Pre-auth token expired or invalid');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.totpSecret) {
    // TOTP — no server action needed; client submits code
    return { method: 'totp' };
  }

  // OTP via Africa's Talking SMS
  const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
  await redis.set(`otp:${userId}`, otp, 'EX', OTP_TTL_SECONDS);
  await sendOTP(user.phone, otp);
  return { method: 'sms' };
}

export async function completeMfa(preAuthToken: string, code: string) {
  const userId = await redis.get(`preauth:${preAuthToken}`);
  if (!userId) throw new AppError('invalid_token', 401, 'Pre-auth token expired');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let valid = false;

  if (user.totpSecret) {
    valid = authenticator.verify({ token: code, secret: user.totpSecret });
  } else {
    const stored = await redis.get(`otp:${userId}`);
    valid = stored === code;
    if (valid) await redis.del(`otp:${userId}`);
  }

  if (!valid) {
    authAttempts.inc({ method: 'mfa', outcome: 'fail' });
    throw new AppError('invalid_otp', 401, 'Invalid or expired MFA code');
  }

  await redis.del(`preauth:${preAuthToken}`);
  const { accessToken, refreshToken, scope } = issueTokenPair(userId, user.role);
  await storeRefreshToken(userId, refreshToken);
  authAttempts.inc({ method: 'mfa', outcome: 'success' });
  return { accessToken, refreshToken, scope };
}

export async function setupTotp(userId: string) {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const otpauth = authenticator.keyuri(user.phone, 'Agri-D-Ledger', secret);

  // Store temporarily until confirmed
  await redis.set(`totp_pending:${userId}`, secret, 'EX', 600);
  return { otpauth, secret };
}

export async function confirmTotp(userId: string, code: string) {
  const secret = await redis.get(`totp_pending:${userId}`);
  if (!secret) throw new AppError('expired', 410, 'TOTP setup session expired');

  if (!authenticator.verify({ token: code, secret })) {
    throw new AppError('invalid_otp', 401, 'TOTP code invalid');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret, mfaEnabled: true },
  });
  await redis.del(`totp_pending:${userId}`);
}

export { rotateRefreshToken, revokeRefreshToken };
