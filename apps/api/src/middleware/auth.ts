// src/middleware/auth.ts
// JWT verification middleware using RSA public key (jose library).
// Decoded payload is attached to req.user so downstream route handlers
// can perform RBAC checks without re-verifying the token.

import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, importSPKI } from 'jose';
import type { JwtPayload } from '@agridl/shared-types';
import type { KeyLike } from 'jose';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

let _publicKey: KeyLike | null = null;

async function getPublicKey(): Promise<KeyLike> {
  if (_publicKey) return _publicKey;
  const raw = process.env.JWT_PUBLIC_KEY;
  if (!raw) throw new Error('JWT_PUBLIC_KEY is not set');
  const pem = Buffer.from(raw, 'base64').toString('utf8');
  _publicKey = await importSPKI(pem, 'RS256');
  return _publicKey;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' });
  }

  const token = header.slice(7);
  try {
    const key = await getPublicKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: process.env.JWT_ISSUER ?? 'agridl-api',
    });
    req.user = payload as unknown as JwtPayload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Role '${req.user.role}' is not permitted to access this resource`,
      });
    }
    return next();
  };
}

// Verify internal USSD ↔ API shared secret
export function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret && req.headers['x-internal-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid internal secret' });
  }
  return next();
}
