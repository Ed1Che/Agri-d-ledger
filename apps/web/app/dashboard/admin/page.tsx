'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Users, ShoppingCart, BarChart3, TrendingUp, DollarSign, Wheat } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalFarmers: number
  totalBuyers: number
  activeRegionalBids: number
  totalBidsPlaced: number
  totalBidValue: number
  farmerAvgProducePrice: number
}

const QUICK_LINKS = [
  { href: '/dashboard/admin/farmers', label: 'Farmer Management', description: 'View and manage farmer profiles', icon: Users },
  { href: '/dashboard/admin/buyers', label: 'Buyer Management', description: 'Manage bulk buyer accounts', icon: ShoppingCart },
  { href: '/dashboard/admin/bids', label: 'Regional Bids', description: 'Create and manage regional bids', icon: Wheat },
  { href: '/dashboard/admin/analytics', label: 'Analytics & Reports', description: 'Detailed platform analytics', icon: BarChart3 },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalFarmers: 0,
    totalBuyers: 0,
    activeRegionalBids: 0,
    totalBidsPlaced: 0,
    totalBidValue: 0,
    farmerAvgProducePrice: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const [
        { count: farmerCount },
        { count: buyerCount },
        { count: activeBids },
        { data: bidsData, count: totalBids },
        { data: produceData },
      ] = await Promise.all([
        supabase.from('farmers').select('*', { count: 'exact', head: true }),
        supabase.from('buyers').select('*', { count: 'exact', head: true }),
        supabase.from('regional_bids').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('bids').select('bid_amount', { count: 'exact' }),
        supabase.from('farmer_produce').select('asking_price_per_unit'),
      ])

      const totalValue = (bidsData || []).reduce((sum, bid) => sum + (bid.bid_amount || 0), 0)
      const avgPrice =
        produceData && produceData.length > 0
          ? produceData.reduce((sum, item) => sum + (item.asking_price_per_unit || 0), 0) / produceData.length
          : 0

      setStats({
        totalFarmers: farmerCount || 0,
        totalBuyers: buyerCount || 0,
        activeRegionalBids: activeBids || 0,
        totalBidsPlaced: totalBids || 0,
        totalBidValue: totalValue,
        farmerAvgProducePrice: avgPrice,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" aria-live="polite">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Farmers', value: stats.totalFarmers.toLocaleString(), sub: 'Active on platform', icon: Users },
    { label: 'Total Buyers', value: stats.totalBuyers.toLocaleString(), sub: 'Registered bulk buyers', icon: ShoppingCart },
    { label: 'Active Regional Bids', value: stats.activeRegionalBids.toLocaleString(), sub: 'Open for bidding', icon: Wheat },
    { label: 'Total Bids Placed', value: stats.totalBidsPlaced.toLocaleString(), sub: 'All time bids', icon: BarChart3 },
    { label: 'Total Bid Value', value: `KES ${stats.totalBidValue.toLocaleString()}`, sub: 'Cumulative bid amount', icon: DollarSign },
    { label: 'Avg Farmer Price', value: `KES ${stats.farmerAvgProducePrice.toFixed(2)}`, sub: 'Per unit average', icon: TrendingUp },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map(({ label, value, sub, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
