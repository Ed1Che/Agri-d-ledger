// src/queues/anchor.queue.ts — BullMQ queue for Polygon anchoring

import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export const anchorQueue = new Queue('blockchain-anchor', {
  connection: redis,
  defaultJobOptions: {
    attempts:  3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 500 },
    removeOnFail:     { count: 100 },
  },
});
