// src/middleware/audit.middleware.ts — INSERT-ONLY audit trail

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import type { AuditAction } from '@prisma/client';

function resolveAction(method: string, path: string): AuditAction | null {
  if (path.includes('/auth/login'))   return 'LOGIN';
  if (path.includes('/auth/logout'))  return 'LOGOUT';
  if (path.includes('/auth/refresh')) return 'TOKEN_REFRESH';
  if (path.includes('/auth/mfa'))     return 'MFA_VERIFIED';
  if (method === 'POST' && path.includes('/produce'))      return 'PRODUCE_CREATED';
  if (method === 'POST' && path.includes('/transactions')) return 'TRANSACTION_CREATED';
  if (path.includes('/ledger'))       return 'LEDGER_WRITE';
  return null;
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const action = resolveAction(req.method, req.path);
    if (!action) return;

    const userId = (req as any).user?.sub ?? null;

    prisma.auditEvent.create({
      data: {
        userId,
        action,
        ip:        req.ip ?? 'unknown',
        userAgent: req.headers['user-agent'] ?? null,
        path:      req.path,
        status:    res.statusCode,
        meta:      { requestId: (req as any).requestId },
      },
    }).catch(err => logger.error('Audit log write failed', err));
  });
  next();
}
