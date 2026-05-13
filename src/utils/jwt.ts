// src/utils/jwt.ts — JWT issuance and validation (RS256)

import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import type { Role } from '@prisma/client';
import type { JwtPayload } from '../types/index.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

const PRIVATE_KEY = readFileSync(process.env.JWT_PRIVATE_KEY_PATH ?? './keys/private.pem');
const PUBLIC_KEY  = readFileSync(process.env.JWT_PUBLIC_KEY_PATH  ?? './keys/public.pem');

const ROLE_SCOPES: Record<Role, string[]> = {
  FARMER:      ['produce:write', 'produce:read', 'tx:read',   'users:self'],
  BUYER:       ['produce:read',  'tx:write',     'tx:read',   'users:self'],
  COOP_ADMIN:  ['produce:read',  'produce:write','users:read','tx:read'],
  REGULATOR:   ['ledger:read',   'audit:read'],
  SUPER_ADMIN: ['*'],
};

const REFRESH_TTL_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS ?? '7', 10);

export function issueTokenPair(userId: string, role: Role) {
  const scope = ROLE_SCOPES[role];

  const accessToken = jwt.sign(
    { sub: userId, role, scope },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '15m', issuer: process.env.JWT_ISSUER ?? 'agri-dl' }
  );

  const refreshToken = randomBytes(48).toString('hex');
  return { accessToken, refreshToken, scope };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER ?? 'agri-dl',
  }) as JwtPayload;
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  await redis.set(`rt:${userId}`, token, 'EX', REFRESH_TTL_DAYS * 86400);
}

export async function rotateRefreshToken(
  userId: string,
  role: Role,
  incomingToken: string
): Promise<{ accessToken: string; refreshToken: string; scope: string[] }> {
  const stored = await redis.get(`rt:${userId}`);

  if (stored !== incomingToken) {
    // Possible replay attack — invalidate entire family
    await redis.del(`rt:${userId}`);
    logger.warn('Refresh token replay detected', { userId });
    throw new Error('invalid_refresh_token');
  }

  const { accessToken, refreshToken, scope } = issueTokenPair(userId, role);
  await storeRefreshToken(userId, refreshToken);
  return { accessToken, refreshToken, scope };
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(`rt:${userId}`);
}
