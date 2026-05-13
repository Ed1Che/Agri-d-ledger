// src/config/database.ts

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn'  },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

prisma.$on('error', (e) => logger.error('Prisma error', e));
prisma.$on('warn',  (e) => logger.warn('Prisma warn', e));

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
