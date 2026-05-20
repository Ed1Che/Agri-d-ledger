// packages/api-client/src/index.ts
// Typed fetch wrapper for the Agri-D-Ledger Express API.
// Used by the Next.js web app — avoids raw fetch calls with untyped responses.
// Also exports helpers used by the USSD module to notify the API of listing events.

import type {
  ApiResponse,
  ApiError,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserProfile,
  Produce,
  CreateProduceRequest,
  Transaction,
  CreateTransactionRequest,
  LedgerEntry,
  PricePredictionRequest,
  PricePredictionResponse,
  CreditScoreResponse,
  PaginationMeta,
  USSDListingUpdate,
} from '@agridl/shared-types';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export class AgridlApiClient {
  private readonly baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl?: string) {
    const env = (globalThis as any).process?.env;
    this.baseUrl =
      baseUrl ??
      (typeof window !== 'undefined'
        ? (env?.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
        : (env?.API_URL ?? 'http://localhost:3001'));
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        error: 'unknown',
        message: res.statusText,
      }));
      throw new ApiClientError(err.error, err.message, res.status);
    }

    return res.json() as Promise<T>;
  }

  // ── Auth ─────────────────────────────────────────────────────────────

  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request('POST', '/api/v1/auth/login', data);
  }

  async register(data: RegisterRequest): Promise<ApiResponse<UserProfile>> {
    return this.request('POST', '/api/v1/auth/register', data);
  }

  async refreshToken(userId: string, refreshToken: string) {
    return this.request<ApiResponse<LoginResponse>>('POST', '/api/v1/auth/refresh', {
      userId,
      refreshToken,
    });
  }

  async logout() {
    return this.request('POST', '/api/v1/auth/logout');
  }

  async initiateMfa(preAuthToken: string) {
    return this.request('POST', '/api/v1/auth/mfa/initiate', { preAuthToken });
  }

  async verifyMfa(preAuthToken: string, code: string) {
    return this.request<ApiResponse<LoginResponse>>('POST', '/api/v1/auth/mfa/verify', {
      preAuthToken,
      code,
    });
  }

  // ── Users ─────────────────────────────────────────────────────────────

  async getMe(): Promise<ApiResponse<UserProfile>> {
    return this.request('GET', '/api/v1/users/me');
  }

  async updateMe(data: { email?: string }): Promise<ApiResponse<UserProfile>> {
    return this.request('PATCH', '/api/v1/users/me', data);
  }

  // ── Produce ───────────────────────────────────────────────────────────

  async listProduce(params?: {
    county?: string;
    crop?: string;
    status?: string;
    farmerId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Produce[]; meta: PaginationMeta }> {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return this.request('GET', `/api/v1/produce${qs ? `?${qs}` : ''}`);
  }

  async createProduce(data: CreateProduceRequest): Promise<ApiResponse<Produce>> {
    return this.request('POST', '/api/v1/produce', data);
  }

  async getProduce(id: string): Promise<ApiResponse<Produce>> {
    return this.request('GET', `/api/v1/produce/${id}`);
  }

  async updateProducePrice(id: string, pricePerKg: number): Promise<ApiResponse<Produce>> {
    return this.request('PATCH', `/api/v1/produce/${id}/price`, { pricePerKg });
  }

  // ── Transactions ──────────────────────────────────────────────────────

  async createTransaction(data: CreateTransactionRequest): Promise<ApiResponse<Transaction>> {
    return this.request('POST', '/api/v1/transactions', data);
  }

  async listTransactions(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Transaction[]; meta: PaginationMeta }> {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return this.request('GET', `/api/v1/transactions${qs ? `?${qs}` : ''}`);
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return this.request('GET', `/api/v1/transactions/${id}`);
  }

  // ── Ledger ────────────────────────────────────────────────────────────

  async listLedger(params?: { page?: number; pageSize?: number }) {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return this.request<{ data: LedgerEntry[]; meta: PaginationMeta }>(
      'GET',
      `/api/v1/ledger${qs ? `?${qs}` : ''}`
    );
  }

  async verifyLedger(transactionId: string): Promise<ApiResponse<{ verified: boolean }>> {
    return this.request('GET', `/api/v1/ledger/${transactionId}/verify`);
  }

  // ── ML ────────────────────────────────────────────────────────────────

  async predictPrice(data: PricePredictionRequest): Promise<ApiResponse<PricePredictionResponse>> {
    return this.request('POST', '/api/v1/ml/price', data);
  }

  async getCreditScore(farmerId: string, membershipMonths: number): Promise<ApiResponse<CreditScoreResponse>> {
    return this.request('POST', `/api/v1/ml/credit/${farmerId}`, { membershipMonths });
  }

  // ── USSD Integration ──────────────────────────────────────────────────
  // Used by apps/ussd to push listing status updates back to this API,
  // so the web dashboard can reflect USSD-originated produce in real time.

  async updateUssdListing(update: USSDListingUpdate): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request('POST', '/api/v1/ussd/listing-update', update);
  }

  async getUssdFarmerProfile(phoneNumber: string): Promise<ApiResponse<UserProfile | null>> {
    const encoded = encodeURIComponent(phoneNumber);
    return this.request('GET', `/api/v1/ussd/farmer/${encoded}`);
  }
}

export const apiClient = new AgridlApiClient();
