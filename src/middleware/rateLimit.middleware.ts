// src/middleware/rateLimit.middleware.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';

const store = new RedisStore({ sendCommand: (...args: string[]) => redis.call(...args) });

// Global API gateway limiter — 120 req/min per IP
export const gatewayLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  store,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  handler: (_, res) =>
    res.status(429).json({ error: 'rate_exceeded', message: 'Too many requests', retryAfter: 60 }),
});

// Strict limiter for auth endpoints — 10 attempts/15min per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  store,
  keyGenerator: (req) => `auth:${req.ip}`,
  handler: (_, res) =>
    res.status(429).json({ error: 'rate_exceeded', message: 'Too many auth attempts', retryAfter: 900 }),
});

// USSD callback limiter — Africa's Talking infrastructure gets higher quota
export const ussdLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  store,
  keyGenerator: (req) =>
    (req.headers['x-africastalking-ip'] as string) ?? req.ip ?? 'unknown',
  handler: (_, res) =>
    res.status(429).json({ error: 'rate_exceeded', message: 'USSD rate exceeded' }),
});
