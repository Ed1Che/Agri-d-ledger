// src/types/index.ts — shared types across the application

import type { Request } from 'express';
import type { Role } from '@prisma/client';

// ── Auth ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;          // userId
  role: Role;
  scope: string[];
  iss: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  requestId: string;
}

// ── API responses ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  message: string;
  code?: number;
  traceId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ── USSD ───────────────────────────────────────────────────────────────

export interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
  networkCode?: string;
}

export interface USSDResponse {
  text: string;
  isEnd: boolean;
}

// ── Blockchain ─────────────────────────────────────────────────────────

export interface AnchorPayload {
  transactionId: string;
  dataHash: string;
}

export interface OnChainReceipt {
  txHash: string;
  blockNumber: number;
  contractAddress: string;
}

// ── ZKP ────────────────────────────────────────────────────────────────

export type ZkpProofType = 'FARMER_MEMBERSHIP' | 'TX_RANGE';

export interface ZkpProofInput {
  proofType: ZkpProofType;
  publicInputs: bigint[];
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
}

// ── ML service ─────────────────────────────────────────────────────────

export interface PricePredictionRequest {
  crop: string;
  county: string;
  weightKg: number;
  gradeCode: string;
}

export interface PricePredictionResponse {
  pricePerKg: number;
  confidence: number;
  model: string;
}

export interface CreditScoreRequest {
  farmerId: string;
  transactionHistory: number;
  avgTransactionKg: number;
  membershipMonths: number;
}

export interface CreditScoreResponse {
  score: number;       // 0-1000
  tier: 'A' | 'B' | 'C' | 'D';
  eligible: boolean;
}
