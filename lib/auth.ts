import { createClient } from '@/lib/supabase/server'

export type UserRole = 'farmer' | 'buyer' | 'admin' | 'system_admin' | null

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getUserRole(): Promise<UserRole> {
  const user = await getCurrentUser()
  if (!user) return null

  const userType = user.user_metadata?.user_type
  return userType || 'farmer'
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin' || role === 'system_admin'
}

export async function isBuyer(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'buyer'
}

export async function isFarmer(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'farmer'
}

export async function requireRole(...roles: UserRole[]) {
  const role = await getUserRole()
  if (!role || !roles.includes(role)) {
    throw new Error('Unauthorized')
  }
  return role
}
