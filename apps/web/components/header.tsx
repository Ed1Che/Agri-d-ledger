'use client'
// apps/web/components/header.tsx
// Role-aware navigation header. Uses useAuth() from AuthProvider — never
// calls Supabase directly so session state is always consistent.

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function Header() {
  const { user, role, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="font-bold text-xl text-primary">Agri-D-Ledger</div>
        </Link>

        <nav className="flex items-center gap-8">
          {role === 'buyer' && (
            <>
              <Link href="/dashboard/buyer" className="text-sm hover:text-primary">Offers</Link>
              <Link href="/dashboard/buyer/bids" className="text-sm hover:text-primary">My Bids</Link>
              <Link href="/dashboard/buyer/notifications" className="text-sm hover:text-primary">Notifications</Link>
            </>
          )}

          {role === 'farmer' && (
            <>
              <Link href="/dashboard/farmer" className="text-sm hover:text-primary">My Produce</Link>
              <Link href="/dashboard/farmer/bids" className="text-sm hover:text-primary">Bid Offers</Link>
              <Link href="/dashboard/farmer/notifications" className="text-sm hover:text-primary">Notifications</Link>
            </>
          )}

          {(role === 'admin' || role === 'system_admin') && (
            <>
              <Link href="/dashboard/admin" className="text-sm hover:text-primary">Dashboard</Link>
              <Link href="/dashboard/admin/farmers" className="text-sm hover:text-primary">Farmers</Link>
              <Link href="/dashboard/admin/buyers" className="text-sm hover:text-primary">Buyers</Link>
              <Link href="/dashboard/admin/bids" className="text-sm hover:text-primary">Regional Bids</Link>
              <Link href="/dashboard/admin/analytics" className="text-sm hover:text-primary">Analytics</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
