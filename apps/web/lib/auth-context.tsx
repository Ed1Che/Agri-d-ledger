'use client'
// apps/web/lib/auth-context.tsx
// Provides Supabase session AND the matching Express JWT to all client components.
// Place <AuthProvider> inside the root layout body.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setApiToken, restoreApiToken } from '@/lib/api'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  role: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore any existing Express JWT from localStorage on first mount
    restoreApiToken()

    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(session?.user?.user_metadata?.user_type ?? null)

      if (session?.access_token) {
        // Exchange Supabase JWT for a signed Express RS256 JWT so all API
        // calls use the correct auth system.
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/supabase-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supabaseAccessToken: session.access_token }),
        })
          .then((r) => r.json())
          .then(({ data }) => setApiToken(data?.accessToken ?? null))
          .catch(() => setApiToken(session.access_token))
      } else {
        setApiToken(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setApiToken(null)
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
