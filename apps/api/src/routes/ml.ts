// src/routes/ml.ts
// Stub ML routes. In production these call an external ML microservice
// (Python/FastAPI) via internal HTTP. The stubs below return plausible
// mock values so the rest of the stack can develop independently.

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

export const mlRouter = Router();

const priceSchema = z.object({
  crop: z.string(),
  county: z.string(),
  weightKg: z.number().positive(),
  gradeCode: z.string(),
});

// POST /api/v1/ml/price
mlRouter.post('/price', requireAuth, async (req, res, next) => {
  try {
    const body = priceSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'validation_error', message: body.error.message });

    // TODO: forward to ML service at process.env.ML_SERVICE_URL
    // For now, return a deterministic mock
    const basePrices: Record<string, number> = { maize: 45, coffee: 350, tea: 120, potatoes: 30 };
    const base = basePrices[body.data.crop.toLowerCase()] ?? 60;
    const gradeMultipliers: Record<string, number> = { AA: 1.2, AB: 1.0, PB: 0.85, C: 0.7 };
    const multiplier = gradeMultipliers[body.data.gradeCode] ?? 1.0;

    return res.json({
      data: {
        pricePerKg: parseFloat((base * multiplier).toFixed(2)),
        confidence: 0.78,
        model: 'stub-v1',
      },
    });
  } catch (err) { next(err); }
});

// POST /api/v1/ml/credit/:farmerId
mlRouter.post('/credit/:farmerId', requireAuth, async (req, res, next) => {
  try {
    const { membershipMonths = 0 } = req.body;
    // Simple rule-based stub
    const score = Math.min(850, 500 + membershipMonths * 5);
    const tier = score >= 750 ? 'A' : score >= 650 ? 'B' : score >= 550 ? 'C' : 'D';
    return res.json({ data: { score, tier, eligible: score >= 600 } });
  } catch (err) { next(err); }
});
