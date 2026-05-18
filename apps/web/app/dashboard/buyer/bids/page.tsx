'use client'

import { createClient } from '@/lib/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface BidRecord {
  id: string
  regional_bid_id: string
  offered_price_per_unit: number
  total_quantity_bid: number
  bid_amount: number
  status: string
  negotiation_deviation_percentage: number
  created_at: string
  regional_bids?: {
    region: string
  }
}

export default function BuyerBidsPage() {
  const [bids, setBids] = useState<BidRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBids()
  }, [])

  const loadBids = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get buyer profile
      const { data: buyerData } = await supabase
        .from('buyers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!buyerData) throw new Error('Buyer profile not found')

      // Get bids
      const { data, error: err } = await supabase
        .from('bids')
        .select('*, regional_bids(region)')
        .eq('buyer_id', buyerData.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setBids(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Bids</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage all your placed bids
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your bids...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : bids.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">You haven&apos;t placed any bids yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <Card key={bid.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {bid.regional_bids?.region || 'Unknown Region'}
                    </CardTitle>
                    <CardDescription>
                      Bid placed on {new Date(bid.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(bid.status)}>
                    {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Offered Price</p>
                    <p className="text-lg font-semibold">${bid.offered_price_per_unit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="text-lg font-semibold">{bid.total_quantity_bid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-semibold">${bid.bid_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Negotiation %</p>
                    <p className={`text-lg font-semibold ${
                      bid.negotiation_deviation_percentage > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {bid.negotiation_deviation_percentage > 0 ? '+' : ''}
                      {bid.negotiation_deviation_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
