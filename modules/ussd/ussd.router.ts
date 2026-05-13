// src/modules/ussd/ussd.router.ts

import { Router } from 'express';
import { handleUSSD } from './ussd.service.js';
import { ussdLimiter } from '../../middleware/rateLimit.middleware.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

const router = Router();

function verifyATSignature(req: any): boolean {
  const secret = process.env.AT_CALLBACK_SECRET;
  if (!secret) return true; // skip in dev
  const signature = req.headers['x-africastalking-signature'];
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('base64');
  return signature === expected;
}

// POST /ussd/callback — Africa's Talking webhook
router.post('/callback', ussdLimiter, async (req, res) => {
  if (!verifyATSignature(req)) {
    logger.warn('Invalid AT webhook signature', { ip: req.ip });
    return res.status(403).send('END Unauthorized');
  }

  try {
    const { sessionId, serviceCode, phoneNumber, text, networkCode } = req.body;
    const response = await handleUSSD({ sessionId, serviceCode, phoneNumber, text, networkCode });
    res.set('Content-Type', 'text/plain');
    res.send(`${response.isEnd ? 'END' : 'CON'} ${response.text.replace(/^(CON|END)\s/, '')}`);
  } catch (err) {
    logger.error('USSD handler error', err);
    res.set('Content-Type', 'text/plain');
    res.send('END Service temporarily unavailable. Please try again.');
  }
});

export default router;
