// src/middleware/metrics.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import { httpRequestDuration } from '../config/metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method:      req.method,
      route:       req.route?.path ?? req.path,
      status_code: String(res.statusCode),
    });
  });
  next();
}
