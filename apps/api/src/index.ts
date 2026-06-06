import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { produceRouter } from './routes/produce';
import { transactionsRouter } from './routes/transactions';
import { ledgerRouter } from './routes/ledger';
import { mlRouter } from './routes/ml';
import { ussdRouter } from './routes/ussd';
import { usersRouter } from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { startBlockchainAnchor } from './jobs/blockchainAnchor';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.WEB_APP_URL ?? 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000), // 15 min
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Body parsing & utilities ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/produce', produceRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/ledger', ledgerRouter);
app.use('/api/v1/ml', mlRouter);
app.use('/api/v1/ussd', ussdRouter);   // internal USSD ↔ API bridge

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'agridl-api', timestamp: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Agri-D-Ledger API running on port ${PORT} [${process.env.NODE_ENV}]`);
  if (process.env.BLOCKCHAIN_RPC_URL) startBlockchainAnchor();
});

export default app;
