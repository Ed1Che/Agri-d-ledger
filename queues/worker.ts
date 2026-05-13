// src/queues/worker.ts — BullMQ worker process (run separately from API)

import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { anchorTransaction } from '../modules/ledger/ledger.service.js';
import { connectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';

type AnchorJob = { transactionId: string; dataHash: string };

async function main() {
  await connectDatabase();

  const worker = new Worker<AnchorJob>(
    'blockchain-anchor',
    async (job: Job<AnchorJob>) => {
      const { transactionId, dataHash } = job.data;
      logger.info(`Processing anchor job ${job.id}`, { transactionId });
      await anchorTransaction(transactionId, dataHash);
    },
    {
      connection: redis,
      concurrency: 3,   // max 3 concurrent Polygon txs
    }
  );

  worker.on('completed', (job) =>
    logger.info(`Anchor job ${job.id} completed`, { txId: job.data.transactionId })
  );
  worker.on('failed', (job, err) =>
    logger.error(`Anchor job ${job?.id} failed`, { err, txId: job?.data.transactionId })
  );

  logger.info('Blockchain anchor worker started');

  process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
  });
}

main();
