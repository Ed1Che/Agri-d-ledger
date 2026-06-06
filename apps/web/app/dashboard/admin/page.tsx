'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalFarmers: number
  totalBuyers: number
  activeRegionalBids: number
  totalBidsPlaced: number
  totalBidValue: number
  farmerAvgProducePrice: number
}

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

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get farmer count
      const { count: farmerCount } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })

      // Get buyer count
      const { count: buyerCount } = await supabase
        .from('buyers')
        .select('*', { count: 'exact', head: true })

      // Get active regional bids
      const { count: activeBids } = await supabase
        .from('regional_bids')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      // Get total bids placed
      const { data: bidsData, count: totalBids } = await supabase
        .from('bids')
        .select('bid_amount', { count: 'exact' })

      // Calculate total bid value
      const totalValue = (bidsData || []).reduce((sum, bid) => sum + (bid.bid_amount || 0), 0)

      // Get average farmer produce price
      const { data: produceData } = await supabase
        .from('farmer_produce')
        .select('asking_price_per_unit')

      const avgPrice = produceData && produceData.length > 0
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
    return <div className="text-center py-12"><p className="text-muted-foreground">Loading dashboard...</p></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Platform overview and key metrics
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Farmers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalFarmers}</p>
            <p className="text-xs text-muted-foreground mt-2">Active farmers on platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalBuyers}</p>
            <p className="text-xs text-muted-foreground mt-2">Registered bulk buyers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Regional Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.activeRegionalBids}</p>
            <p className="text-xs text-muted-foreground mt-2">Open for bidding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bids Placed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalBidsPlaced}</p>
            <p className="text-xs text-muted-foreground mt-2">All time bids</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bid Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${stats.totalBidValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Cumulative bid amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Farmer Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${stats.farmerAvgProducePrice.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Per unit average</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
          <CardDescription>Manage platform data and operations</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/dashboard/admin/farmers" className="p-4 border rounded-lg hover:bg-secondary transition-colors">
            <p className="font-semibold">Farmer Management</p>
            <p className="text-sm text-muted-foreground">View and manage farmer profiles</p>
          </a>
          <a href="/dashboard/admin/buyers" className="p-4 border rounded-lg hover:bg-secondary transition-colors">
            <p className="font-semibold">Buyer Management</p>
            <p className="text-sm text-muted-foreground">Manage bulk buyer accounts</p>
          </a>
          <a href="/dashboard/admin/bids" className="p-4 border rounded-lg hover:bg-secondary transition-colors">
            <p className="font-semibold">Regional Bids</p>
            <p className="text-sm text-muted-foreground">Create and manage regional bids</p>
          </a>
          <a href="/dashboard/admin/analytics" className="p-4 border rounded-lg hover:bg-secondary transition-colors">
            <p className="font-semibold">Analytics & Reports</p>
            <p className="text-sm text-muted-foreground">Detailed platform analytics</p>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
