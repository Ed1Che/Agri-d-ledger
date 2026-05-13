// tests/setup.ts
import { vi } from 'vitest';

// Suppress logger noise in tests
vi.mock('../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), http: vi.fn(), debug: vi.fn() },
}));

process.env.NODE_ENV           = 'test';
process.env.JWT_ISSUER         = 'agri-dl-test';
process.env.JWT_PRIVATE_KEY_PATH = './keys/private.pem';
process.env.JWT_PUBLIC_KEY_PATH  = './keys/public.pem';
