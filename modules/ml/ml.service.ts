// src/modules/ml/ml.service.ts — ML microservice proxy

import { AppError } from '../../middleware/error.middleware.js';
import type { PricePredictionRequest, PricePredictionResponse, CreditScoreRequest, CreditScoreResponse } from '../../types/index.js';
import { prisma } from '../../config/database.js';

const ML_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const ML_KEY = process.env.ML_SERVICE_API_KEY ?? '';

async function mlFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ML_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': ML_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new AppError('ml_error', 502, 'ML service unavailable');
  return res.json() as Promise<T>;
}

export async function predictPrice(req: PricePredictionRequest): Promise<PricePredictionResponse> {
  return mlFetch<PricePredictionResponse>('/predict/price', req);
}

export async function scoreFarmerCredit(req: CreditScoreRequest): Promise<CreditScoreResponse> {
  // Enrich with on-chain transaction history
  const txCount = await prisma.transaction.count({
    where: { farmerId: req.farmerId, status: 'CONFIRMED' },
  });
  const avgKg = await prisma.transaction.aggregate({
    where: { farmerId: req.farmerId, status: 'CONFIRMED' },
    _avg: { weightKg: true },
  });

  return mlFetch<CreditScoreResponse>('/predict/credit', {
    ...req,
    transactionHistory: txCount,
    avgTransactionKg:   avgKg._avg.weightKg ?? 0,
  });
}
