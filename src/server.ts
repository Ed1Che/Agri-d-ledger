// src/server.ts — Agri-D-Ledger API server entry point

import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { connectRedis } from './config/redis.js';
import { connectDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { startMetricsServer } from './config/metrics.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function bootstrap() {
  try {
    await connectDatabase();
    logger.info('PostgreSQL connected');

    await connectRedis();
    logger.info('Redis connected');

    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`Agri-D-Ledger API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    startMetricsServer();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Bootstrap failed', err);
    process.exit(1);
  }
}

bootstrap();
