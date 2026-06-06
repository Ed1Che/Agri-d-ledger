// apps/web/lib/supabase/client.ts
// Browser-side Supabase client used by AuthProvider and client components.
// Never import this in Server Components — use the server client instead.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
