// src/middleware/error.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const traceId = (req as any).requestId ?? 'unknown';

  if (err instanceof AppError) {
    logger.warn('AppError', { code: err.code, status: err.statusCode, traceId });
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      traceId,
    });
    return;
  }

  logger.error('Unhandled error', { err, traceId });
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred',
    traceId,
  });
}
