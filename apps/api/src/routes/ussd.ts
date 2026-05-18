// src/routes/ussd.ts
// Internal bridge routes consumed by apps/ussd (not the public API).
// Secured with the shared INTERNAL_API_SECRET header.

import { Router } from 'express';
import { z } from 'zod';
import { requireInternalSecret } from '../middleware/auth';
import { logger } from '../utils/logger';

export const ussdRouter = Router();

const newListingSchema = z.object({
  listingId: z.string(),
  phoneNumber: z.string(),
  cropType: z.string(),
  quantity: z.coerce.number().positive(),
  askedPrice: z.coerce.number().positive(),
});

// POST /api/v1/ussd/new-listing
// Called by apps/ussd after a farmer submits a listing via USSD.
ussdRouter.post('/new-listing', requireInternalSecret, async (req, res, next) => {
  try {
    const body = newListingSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'validation_error', message: body.error.message });

    logger.info({ event: 'ussd_listing_received', ...body.data });

    // TODO: trigger ML price suggestion and IoT verification pipeline
    // For now, acknowledge receipt.
    return res.json({ ok: true, received: body.data.listingId });
  } catch (err) { next(err); }
});

// POST /api/v1/ussd/listing-update
// Called by the ML/IoT pipeline to push status updates back through the API.
ussdRouter.post('/listing-update', requireInternalSecret, async (req, res, next) => {
  try {
    const { listingId, status, suggestedPrice, riskLevel } = req.body;
    if (!listingId || !status) return res.status(400).json({ error: 'listingId and status required' });
    // TODO: persist to DB and/or push to apps/ussd webhook
    logger.info({ event: 'ussd_listing_updated', listingId, status });
    return res.json({ ok: true, listingId, status });
  } catch (err) { next(err); }
});

// GET /api/v1/ussd/farmer/:phoneNumber
// Fetch a farmer's profile by phone number (for USSD session enrichment).
ussdRouter.get('/farmer/:phoneNumber', requireInternalSecret, async (req, res, next) => {
  try {
    // Placeholder — real implementation queries Supabase or Prisma User table
    return res.json({ data: null });
  } catch (err) { next(err); }
});
