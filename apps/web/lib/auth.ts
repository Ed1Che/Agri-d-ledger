// apps/web/lib/auth.ts
// Server-side auth helpers used by Server Components (e.g. dashboard/page.tsx).
// These run on the server; never import client-side Supabase here.

import { createClient } from '@/lib/lib/supabase/server'

/**
 * Returns the currently authenticated Supabase user, or null if not logged in.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

/**
 * Returns the role stored in the user's metadata, or null.
 * The role is set during sign-up via `user_metadata.user_type`.
 * Falls back to 'farmer' so untagged users land on the farmer dashboard.
 */
export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null
  return (user.user_metadata?.user_type as string) ?? 'farmer'
}
