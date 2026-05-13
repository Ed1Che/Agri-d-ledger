// src/app.ts — Express application factory

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler }       from './middleware/error.middleware.js';
import { requestId }          from './middleware/requestId.middleware.js';
import { auditLogger }        from './middleware/audit.middleware.js';
import { metricsMiddleware }  from './middleware/metrics.middleware.js';
import { gatewayLimiter }     from './middleware/rateLimit.middleware.js';

import authRouter      from './modules/auth/auth.router.js';
import ussdRouter      from './modules/ussd/ussd.router.js';
import usersRouter     from './modules/users/users.router.js';
import produceRouter   from './modules/produce/produce.router.js';
import txRouter        from './modules/transactions/transactions.router.js';
import ledgerRouter    from './modules/ledger/ledger.router.js';
import auditRouter     from './modules/audit/audit.router.js';
import mlRouter        from './modules/ml/ml.router.js';

export const app = express();

// ── Security headers ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));

// ── CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true })); // USSD callbacks

// ── Observability ─────────────────────────────────────────────────────
app.use(requestId);
app.use(metricsMiddleware);
app.use(morgan('combined', {
  stream: { write: (msg) => require('./config/logger.js').logger.http(msg.trim()) },
}));

// ── Rate limiting (gateway level) ─────────────────────────────────────
app.use('/api/', gatewayLimiter);

// ── Audit logging (fires after response) ─────────────────────────────
app.use(auditLogger);

// ── Health / readiness ─────────────────────────────────────────────────
app.get('/health',   (_, res) => res.json({ status: 'ok' }));
app.get('/ready',    async (_, res) => {
  const { prisma } = await import('./config/database.js');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

// ── API routes ────────────────────────────────────────────────────────
const v1 = `/api/${process.env.API_VERSION ?? 'v1'}`;

app.use(`${v1}/auth`,         authRouter);
app.use(`/ussd`,              ussdRouter);      // no version prefix — AT callback
app.use(`${v1}/users`,        usersRouter);
app.use(`${v1}/produce`,      produceRouter);
app.use(`${v1}/transactions`, txRouter);
app.use(`${v1}/ledger`,       ledgerRouter);
app.use(`${v1}/audit`,        auditRouter);
app.use(`${v1}/ml`,           mlRouter);

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// ── Global error handler ──────────────────────────────────────────────
app.use(errorHandler);
