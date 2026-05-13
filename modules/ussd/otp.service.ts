// src/modules/ussd/otp.service.ts — OTP delivery via Africa's Talking

import AfricasTalking from 'africastalking';
import { logger } from '../../config/logger.js';

const at = AfricasTalking({
  apiKey:   process.env.AT_API_KEY ?? '',
  username: process.env.AT_USERNAME ?? 'sandbox',
});

export async function sendOTP(phone: string, otp: string): Promise<void> {
  try {
    await at.SMS.send({
      to:      [phone],
      message: `Agri-D-Ledger verification code: ${otp}. Valid for 5 minutes. Do not share.`,
      from:    process.env.AT_SENDER_ID ?? 'AGRIDL',
    });
    logger.info('OTP sent', { phone: phone.slice(0, 8) + '****' });
  } catch (err) {
    logger.error('OTP delivery failed', { err });
    throw new Error('otp_delivery_failed');
  }
}
