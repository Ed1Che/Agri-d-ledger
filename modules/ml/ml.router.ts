// src/modules/ml/ml.router.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { predictPrice, scoreFarmerCredit } from './ml.service.js';

const router = Router();
router.use(authenticate as any);

router.post('/price', async (req, res, next) => {
  try {
    const data = z.object({
      crop:      z.string(),
      county:    z.string(),
      weightKg:  z.number().positive(),
      gradeCode: z.string(),
    }).parse(req.body);
    const result = await predictPrice(data);
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/credit/:farmerId', async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const data = z.object({ membershipMonths: z.number() }).parse(req.body);
    const result = await scoreFarmerCredit({ farmerId, ...data, transactionHistory: 0, avgTransactionKg: 0 });
    res.json({ data: result });
  } catch (err) { next(err); }
});

export default router;
