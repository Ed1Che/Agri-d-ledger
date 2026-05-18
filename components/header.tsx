'use client'

import { getCurrentUser, getUserRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Header() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || '')
        const role = user.user_metadata?.user_type
        setUserRole(role || 'farmer')
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="font-bold text-xl text-primary">Agri-D-Ledger</div>
        </Link>

        <nav className="flex items-center gap-8">
          {userRole === 'buyer' && (
            <>
              <Link href="/dashboard/buyer" className="text-sm hover:text-primary">
                Offers
              </Link>
              <Link href="/dashboard/buyer/bids" className="text-sm hover:text-primary">
                My Bids
              </Link>
              <Link href="/dashboard/buyer/notifications" className="text-sm hover:text-primary">
                Notifications
              </Link>
            </>
          )}

          {userRole === 'farmer' && (
            <>
              <Link href="/dashboard/farmer" className="text-sm hover:text-primary">
                My Produce
              </Link>
              <Link href="/dashboard/farmer/bids" className="text-sm hover:text-primary">
                Bid Offers
              </Link>
              <Link href="/dashboard/farmer/notifications" className="text-sm hover:text-primary">
                Notifications
              </Link>
            </>
          )}

          {(userRole === 'admin' || userRole === 'system_admin') && (
            <>
              <Link href="/dashboard/admin" className="text-sm hover:text-primary">
                Dashboard
              </Link>
              <Link href="/dashboard/admin/farmers" className="text-sm hover:text-primary">
                Farmers
              </Link>
              <Link href="/dashboard/admin/buyers" className="text-sm hover:text-primary">
                Buyers
              </Link>
              <Link href="/dashboard/admin/bids" className="text-sm hover:text-primary">
                Regional Bids
              </Link>
              <Link href="/dashboard/admin/analytics" className="text-sm hover:text-primary">
                Analytics
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{userEmail}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
