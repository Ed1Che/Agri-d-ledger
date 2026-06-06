import Redis from 'ioredis';
import { logger } from '../utils/logger';

let _client: Redis | null = null;

export function getRedis(): Redis {
  if (_client) return _client;
  _client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });
  _client.on('error', (err) => logger.warn({ event: 'redis_error', message: err.message }));
  return _client;
}
