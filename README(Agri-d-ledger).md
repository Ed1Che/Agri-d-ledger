# Agri-D-Ledger — Backend

Blockchain-backed agricultural supply chain ledger for Kenyan smallholder farmers. Built on Node.js/Express, supabase, Redis, Polygon PoS, and Africa's Talking USSD.

## Architecture overview

```
clients (USSD · buyer portal · coop admin · KEBS)
  └─ Nginx (TLS 1.3 · HTTP/2 · geo-block KE/EAC)
       └─ WAF (ModSecurity OWASP CRS · rate limiter · IP reputation)
            └─ Auth (JWT RS256 · MFA OTP/TOTP · RBAC scopes)
                 └─ ZKP (circom circuits · on-chain Polygon verifier)
                      └─ Service Router
                           ├─ USSD handler     (Africa's Talking)
                           ├─ Transaction svc  (PostgreSQL + BullMQ)
                           ├─ Ledger svc       (Polygon PoS)
                           └─ ML scoring svc   (Python FastAPI proxy)
                      └─ Audit log + Prometheus + Suricata IDS
```

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Generate RSA key pair
npm run keys:generate

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start infrastructure
npm run docker:up

# 5. Run migrations and seed
npm run prisma:migrate
npm run prisma:seed

# 6. Start API server
npm run dev

# 7. Start blockchain worker (separate terminal)
npm run worker:start
```

## Directory structure

```
src/
├── app.ts                     # Express app factory
├── server.ts                  # Entry point + bootstrap
├── config/
│   ├── database.ts            # Prisma singleton
│   ├── redis.ts               # ioredis + Cache helpers
│   ├── logger.ts              # Winston
│   └── metrics.ts             # Prometheus custom metrics
├── middleware/
│   ├── auth.middleware.ts     # JWT verification + RBAC
│   ├── audit.middleware.ts    # INSERT-only audit trail
│   ├── error.middleware.ts    # Global error handler
│   ├── metrics.middleware.ts  # HTTP latency histogram
│   ├── rateLimit.middleware.ts # Token-bucket per IP/key
│   └── requestId.middleware.ts # X-Request-Id header
├── modules/
│   ├── auth/                  # Registration, login, MFA, TOTP
│   ├── ussd/                  # Africa's Talking state machine + OTP
│   ├── users/                 # Profile, admin management
│   ├── produce/               # Crop listings
│   ├── transactions/          # Produce sale transactions
│   ├── ledger/                # Polygon anchoring + verification
│   ├── ml/                    # Price forecast + credit score proxy
│   └── audit/                 # Audit log queries (REGULATOR)
├── queues/
│   ├── anchor.queue.ts        # BullMQ queue definition
│   └── worker.ts              # Separate worker process
├── blockchain/
│   ├── contracts/AgriLedger.sol
│   └── abis/AgriLedger.json
├── utils/
│   └── jwt.ts                 # Issue, verify, rotate
└── types/
    └── index.ts               # Shared TypeScript types
prisma/
├── schema.prisma              # Full data model
└── seed.ts                    # Dev seed data
tests/
├── unit/auth.service.test.ts
├── integration/transactions.test.ts
└── setup.ts
```

## API endpoints

| Method | Path                        | Auth        | Description               |
|--------|-----------------------------|-------------|---------------------------|
| POST   | /api/v1/auth/register       | public      | Register farmer/buyer     |
| POST   | /api/v1/auth/login          | public      | Password login            |
| POST   | /api/v1/auth/mfa/initiate   | public      | Trigger OTP/TOTP          |
| POST   | /api/v1/auth/mfa/verify     | public      | Complete MFA              |
| POST   | /api/v1/auth/refresh        | public      | Rotate refresh token      |
| POST   | /api/v1/auth/logout         | JWT         | Revoke refresh token      |
| GET    | /api/v1/users/me            | JWT         | Own profile               |
| GET    | /api/v1/produce             | JWT         | Browse listings           |
| POST   | /api/v1/produce             | FARMER      | Create listing            |
| POST   | /api/v1/transactions        | BUYER       | Create transaction        |
| GET    | /api/v1/transactions        | JWT         | List transactions         |
| GET    | /api/v1/ledger              | REGULATOR   | Browse ledger entries     |
| GET    | /api/v1/ledger/:id/verify   | REGULATOR   | Cross-check Polygon       |
| POST   | /api/v1/ml/price            | JWT         | Price prediction          |
| POST   | /api/v1/ml/credit/:farmerId | COOP_ADMIN  | Credit score              |
| GET    | /api/v1/audit               | REGULATOR   | Audit trail               |
| POST   | /ussd/callback              | AT webhook  | USSD session handler      |

## Running tests

```bash
npm test                  # all tests
npm run test:coverage     # with coverage report
```

## Environment variables

See `.env.example` for full list. Required for production:

- `DATABASE_URL` — supabase connection string
- `REDIS_URL` — Redis connection string  
- `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` — RSA key files
- `AT_API_KEY` / `AT_USERNAME` — Africa's Talking credentials
- `POLYGON_RPC_URL` — Polygon JSON-RPC endpoint
- `LEDGER_WALLET_PRIVATE_KEY` — Wallet authorised to anchor
- `LEDGER_CONTRACT_ADDRESS` — Deployed AgriLedger contract
