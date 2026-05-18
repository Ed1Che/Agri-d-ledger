'use client'

import { createClient } from '@/lib/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface Analytics {
  totalProduceListings: number
  averageProducePrice: number
  highestProducePrice: number
  lowestProducePrice: number
  totalBidsValue: number
  averageBidValue: number
  bidsConfirmationRate: number
  regionWithMostFarmers: string
  regionWithMostBids: string
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalProduceListings: 0,
    averageProducePrice: 0,
    highestProducePrice: 0,
    lowestProducePrice: 0,
    totalBidsValue: 0,
    averageBidValue: 0,
    bidsConfirmationRate: 0,
    regionWithMostFarmers: '',
    regionWithMostBids: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get produce listings
      const { data: produceData, count: produceCount } = await supabase
        .from('farmer_produce')
        .select('asking_price_per_unit', { count: 'exact' })

      const produceListings = produceCount || 0
      const prices = (produceData || []).map(p => p.asking_price_per_unit)
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
      const highestPrice = prices.length > 0 ? Math.max(...prices) : 0
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0

      // Get bids analytics
      const { data: bidsData, count: bidsCount } = await supabase
        .from('bids')
        .select('bid_amount', { count: 'exact' })

      const bidAmounts = (bidsData || []).map(b => b.bid_amount)
      const totalBids = bidAmounts.reduce((a, b) => a + b, 0)
      const avgBidValue = bidAmounts.length > 0 ? totalBids / bidAmounts.length : 0

      // Get confirmation rate
      const { data: confirmations } = await supabase
        .from('bid_confirmations')
        .select('confirmation_status')

      const confirmed = (confirmations || []).filter(c => c.confirmation_status === 'confirmed').length
      const confirmationRate = (confirmations || []).length > 0 
        ? (confirmed / (confirmations || []).length) * 100 
        : 0

      // Get farmers by region
      const { data: farmersByRegion } = await supabase
        .from('farmers')
        .select('location_region')

      const regionCounts: { [key: string]: number } = {}
      ;(farmersByRegion || []).forEach(f => {
        regionCounts[f.location_region] = (regionCounts[f.location_region] || 0) + 1
      })
      const topFarmerRegion = Object.entries(regionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || ''

      // Get bids by region
      const { data: bidsByRegion } = await supabase
        .from('bids')
        .select('regional_bids(region)')

      const bidRegionCounts: { [key: string]: number } = {}
      ;(bidsByRegion || []).forEach(b => {
        const region = (b.regional_bids as any)?.region
        if (region) bidRegionCounts[region] = (bidRegionCounts[region] || 0) + 1
      })
      const topBidRegion = Object.entries(bidRegionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || ''

      setAnalytics({
        totalProduceListings: produceListings,
        averageProducePrice: avgPrice,
        highestProducePrice: highestPrice,
        lowestProducePrice: lowestPrice,
        totalBidsValue: totalBids,
        averageBidValue: avgBidValue,
        bidsConfirmationRate: confirmationRate,
        regionWithMostFarmers: topFarmerRegion,
        regionWithMostBids: topBidRegion,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Loading analytics...</p></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-2">Detailed platform insights and metrics</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Produce Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalProduceListings}</p>
            <p className="text-xs text-muted-foreground mt-2">Active farmer listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Produce Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${analytics.averageProducePrice.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Per unit average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold">${analytics.lowestProducePrice.toFixed(2)}</span>
              <span className="text-muted-foreground mx-2">to</span>
              <span className="font-bold">${analytics.highestProducePrice.toFixed(2)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">Lowest to highest</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bids Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${analytics.totalBidsValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Cumulative amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Bid Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${analytics.averageBidValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Per bid average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.bidsConfirmationRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-2">Farmer confirmations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Regional Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Region with Most Farmers</p>
              <p className="text-lg font-semibold">{analytics.regionWithMostFarmers || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Region with Most Bids</p>
              <p className="text-lg font-semibold">{analytics.regionWithMostBids || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Takeaways</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Total produce listings represent farmer market supply.</p>
            <p>Price range shows market variation across regions.</p>
            <p>Confirmation rate indicates farmer engagement quality.</p>
            <p>Regional data helps identify market opportunities.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
