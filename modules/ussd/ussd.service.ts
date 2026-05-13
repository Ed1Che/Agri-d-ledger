// src/modules/ussd/ussd.service.ts — USSD session state machine

import { redis } from '../../config/redis.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { ussdSessionCounter } from '../../config/metrics.js';
import type { USSDRequest, USSDResponse } from '../../types/index.js';

// Session TTL: 3 minutes (USSD sessions are short-lived)
const SESSION_TTL = 180;

type SessionState = {
  step: string;
  data: Record<string, string>;
};

export async function handleUSSD(req: USSDRequest): Promise<USSDResponse> {
  const { sessionId, phoneNumber, text } = req;
  const inputs = text.split('*');
  const lastInput = inputs[inputs.length - 1];

  // Lookup or init session
  const sessionKey = `ussd:${sessionId}`;
  let session = await redis.get(sessionKey)
    .then(raw => raw ? JSON.parse(raw) as SessionState : null);

  if (!session) {
    ussdSessionCounter.inc();
    session = { step: 'MAIN', data: {} };
    await redis.set(sessionKey, JSON.stringify(session), 'EX', SESSION_TTL);
  }

  const result = await processStep(session, lastInput, phoneNumber, sessionId);

  if (!result.isEnd) {
    session.step = result.nextStep ?? session.step;
    await redis.set(sessionKey, JSON.stringify(session), 'EX', SESSION_TTL);
  } else {
    await redis.del(sessionKey);
  }

  return result;
}

async function processStep(
  session: SessionState,
  input: string,
  phone: string,
  sessionId: string
): Promise<USSDResponse & { nextStep?: string }> {

  const user = await prisma.user.findUnique({ where: { phone } });

  switch (session.step) {
    case 'MAIN':
      return {
        text: 'CON Welcome to Agri-D-Ledger\n1. Sell produce\n2. Check balance\n3. View transactions\n4. Market prices',
        isEnd: false,
        nextStep: 'MAIN_SELECT',
      };

    case 'MAIN_SELECT':
      if (input === '1') {
        return {
          text: 'CON Enter crop type:\n1. Maize\n2. Coffee\n3. Tea\n4. Other',
          isEnd: false,
          nextStep: 'SELL_CROP',
        };
      }
      if (input === '2') {
        const txs = user ? await prisma.transaction.count({ where: { farmerId: user.id } }) : 0;
        return { text: `END You have ${txs} recorded transactions.`, isEnd: true };
      }
      if (input === '3') {
        const recent = user ? await prisma.transaction.findFirst({
          where: { farmerId: user.id, status: 'CONFIRMED' },
          orderBy: { createdAt: 'desc' },
          select: { totalAmount: true, createdAt: true },
        }) : null;
        const msg = recent
          ? `KES ${recent.totalAmount} on ${recent.createdAt.toLocaleDateString('en-KE')}`
          : 'No confirmed transactions found';
        return { text: `END Last transaction: ${msg}`, isEnd: true };
      }
      if (input === '4') {
        return { text: 'END Market price info coming soon.', isEnd: true };
      }
      return { text: 'END Invalid option. Please try again.', isEnd: true };

    case 'SELL_CROP':
      session.data.crop = ['maize', 'coffee', 'tea', 'other'][parseInt(input) - 1] ?? 'other';
      return {
        text: `CON Enter weight to sell (kg):`,
        isEnd: false,
        nextStep: 'SELL_KG',
      };

    case 'SELL_KG': {
      const kg = parseFloat(input);
      if (isNaN(kg) || kg <= 0 || kg > 10_000) {
        return { text: 'END Invalid weight. Please enter a number between 1 and 10,000.', isEnd: true };
      }
      session.data.weightKg = input;
      return {
        text: `CON Confirm sale:\nCrop: ${session.data.crop}\nWeight: ${kg}kg\n1. Confirm\n2. Cancel`,
        isEnd: false,
        nextStep: 'SELL_CONFIRM',
      };
    }

    case 'SELL_CONFIRM':
      if (input === '1') {
        if (user) {
          await prisma.produce.create({
            data: {
              farmerId: user.id,
              crop:       session.data.crop,
              gradeCode: 'AB',
              weightKg:  parseFloat(session.data.weightKg),
              harvestDate: new Date(),
              county: 'Nairobi',
            },
          });
        }
        return { text: `END Sale listing created. Our team will contact you shortly.`, isEnd: true };
      }
      return { text: 'END Cancelled. Thank you.', isEnd: true };

    default:
      return { text: 'END Session error. Please try again.', isEnd: true };
  }
}
