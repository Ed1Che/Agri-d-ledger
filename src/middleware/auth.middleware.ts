// src/middleware/auth.middleware.ts — JWT verification + RBAC

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './error.middleware.js';

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('missing_token', 401, 'Authorization header required'));
  }

  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(new AppError('invalid_token', 401, 'Token invalid or expired'));
  }
}

export function requireScope(...scopes: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const userScopes = req.user?.scope ?? [];
    const hasWildcard = userScopes.includes('*');
    const hasScope = scopes.every(s => userScopes.includes(s));

    if (!hasWildcard && !hasScope) {
      return next(new AppError('forbidden', 403, `Scope required: ${scopes.join(', ')}`));
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('forbidden', 403, 'Insufficient role'));
    }
    next();
  };
}
