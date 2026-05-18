// src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const traceId = randomUUID();
  logger.error({ traceId, message: err.message, stack: err.stack, path: req.path });

  return res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred',
    traceId,
  });
}
