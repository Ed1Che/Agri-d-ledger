// src/config/metrics.ts

import promClient from 'prom-client';
import http from 'http';
import { logger } from './logger.js';

promClient.collectDefaultMetrics({ prefix: 'agridl_' });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'agridl_http_request_duration_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

export const authAttempts = new promClient.Counter({
  name: 'agridl_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['method', 'outcome'] as const,
});

export const transactionCounter = new promClient.Counter({
  name: 'agridl_transactions_total',
  help: 'Total transactions created',
  labelNames: ['status'] as const,
});

export const blockchainWriteDuration = new promClient.Histogram({
  name: 'agridl_blockchain_write_duration_ms',
  help: 'Polygon transaction anchoring latency',
  buckets: [1000, 2000, 5000, 10000, 30000],
});

export const ussdSessionCounter = new promClient.Counter({
  name: 'agridl_ussd_sessions_total',
  help: 'Total USSD sessions initiated',
});

export const zkpVerifications = new promClient.Counter({
  name: 'agridl_zkp_verifications_total',
  help: 'Total ZKP proof verifications',
  labelNames: ['proof_type', 'result'] as const,
});

export function startMetricsServer(): void {
  const metricsPort = parseInt(process.env.PROMETHEUS_PORT ?? '9090', 10);
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', promClient.register.contentType);
      res.end(await promClient.register.metrics());
    } else {
      res.writeHead(404).end();
    }
  });
  server.listen(metricsPort, () =>
    logger.info(`Metrics server on :${metricsPort}/metrics`)
  );
}
