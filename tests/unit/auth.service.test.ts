// tests/unit/auth.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyAccessToken, issueTokenPair } from '../../src/utils/jwt.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

// Generate test keys before running
beforeEach(() => {
  try {
    mkdirSync('./keys', { recursive: true });
    execSync('openssl genrsa -out ./keys/private.pem 2048 2>/dev/null', { stdio: 'ignore' });
    execSync('openssl rsa -in ./keys/private.pem -pubout -out ./keys/public.pem 2>/dev/null', { stdio: 'ignore' });
  } catch {
    // keys may already exist
  }
  process.env.JWT_PRIVATE_KEY_PATH = './keys/private.pem';
  process.env.JWT_PUBLIC_KEY_PATH  = './keys/public.pem';
  process.env.JWT_ISSUER           = 'agri-dl-test';
});

describe('JWT utilities', () => {
  it('issues a valid RS256 access token', () => {
    const { accessToken } = issueTokenPair('user-123', 'FARMER');
    expect(accessToken).toBeDefined();
    expect(accessToken.split('.')).toHaveLength(3);
  });

  it('verifies a freshly issued token', () => {
    const { accessToken } = issueTokenPair('user-456', 'BUYER');
    const payload = verifyAccessToken(accessToken);
    expect(payload.sub).toBe('user-456');
    expect(payload.role).toBe('BUYER');
    expect(Array.isArray(payload.scope)).toBe(true);
  });

  it('includes correct scopes for FARMER role', () => {
    const { accessToken } = issueTokenPair('farmer-1', 'FARMER');
    const payload = verifyAccessToken(accessToken);
    expect(payload.scope).toContain('produce:write');
    expect(payload.scope).toContain('tx:read');
    expect(payload.scope).not.toContain('audit:read');
  });

  it('throws on tampered token', () => {
    const { accessToken } = issueTokenPair('user-789', 'FARMER');
    const tampered = accessToken.slice(0, -10) + 'tampered!!';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('SUPER_ADMIN has wildcard scope', () => {
    const { accessToken } = issueTokenPair('admin-1', 'SUPER_ADMIN');
    const payload = verifyAccessToken(accessToken);
    expect(payload.scope).toContain('*');
  });
});
