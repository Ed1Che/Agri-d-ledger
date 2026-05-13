// src/config/redis.ts

import Redis from 'ioredis';
import { logger } from './logger.js';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on('error',       (err) => logger.error('Redis error', err));
redis.on('reconnecting',()    => logger.warn('Redis reconnecting'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

// Typed helpers
export const Cache = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialised = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, serialised, 'EX', ttlSeconds);
    } else {
      await redis.set(key, serialised);
    }
  },
  async del(key: string): Promise<void> {
    await redis.del(key);
  },
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await redis.incr(key);
    if (ttlSeconds && val === 1) await redis.expire(key, ttlSeconds);
    return val;
  },
};
