// apps/web/lib/api.ts
// Thin singleton wrapper that initialises AgridlApiClient with the JWT stored
// in localStorage (client) or from an environment variable (server).
// Import { api } instead of calling fetch() directly in page/component code.

import { AgridlApiClient } from '@agridl/api-client'

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
    : (process.env.API_URL ?? 'http://localhost:3001')

export const api = new AgridlApiClient(API_URL)

/**
 * Call this after Supabase login returns an access token, OR after the
 * JWT-based login flow returns accessToken.
 * Persists the token to localStorage so it survives page refreshes.
 */
export function setApiToken(token: string | null) {
  api.setAccessToken(token)
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('agridl_access_token', token)
    } else {
      localStorage.removeItem('agridl_access_token')
    }
  }
}

/**
 * Restore token from localStorage on page load.
 * Called once inside AuthProvider on mount.
 */
export function restoreApiToken() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('agridl_access_token')
    if (token) api.setAccessToken(token)
  }
}
