'use client'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, Sprout, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLink { href: string; label: string }

const FARMER_LINKS: NavLink[] = [
  { href: '/dashboard/farmer', label: 'My Produce' },
  { href: '/dashboard/farmer/bids', label: 'Bid Offers' },
  { href: '/dashboard/farmer/ledger', label: 'Blockchain Ledger' },
  { href: '/dashboard/farmer/notifications', label: 'Notifications' },
]

const BUYER_LINKS: NavLink[] = [
  { href: '/dashboard/buyer', label: 'Regional Offers' },
  { href: '/dashboard/buyer/bids', label: 'My Bids' },
  { href: '/dashboard/buyer/transactions', label: 'Transactions' },
  { href: '/dashboard/buyer/notifications', label: 'Notifications' },
]

const ADMIN_LINKS: NavLink[] = [
  { href: '/dashboard/admin', label: 'Overview' },
  { href: '/dashboard/admin/farmers', label: 'Farmers' },
  { href: '/dashboard/admin/buyers', label: 'Buyers' },
  { href: '/dashboard/admin/bids', label: 'Regional Bids' },
  { href: '/dashboard/admin/analytics', label: 'Analytics' },
]

export function Header() {
  const { user, role, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const links =
    role === 'buyer'
      ? BUYER_LINKS
      : role === 'admin' || role === 'system_admin'
      ? ADMIN_LINKS
      : FARMER_LINKS

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <Sprout className="h-6 w-6 text-primary" aria-hidden />
          <span className="font-bold text-lg text-primary hidden sm:block">Agri-D-Ledger</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[160px]">
            {user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t px-4 py-3 flex flex-col gap-1 bg-card"
          aria-label="Mobile navigation"
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t mt-2 text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
        </nav>
      )}
    </header>
  )
}
