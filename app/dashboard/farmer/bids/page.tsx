'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface BidConfirmation {
  id: string
  bid_id: string
  confirmation_status: string
  confirmation_timestamp?: string
  notification_method: string
  bids?: {
    offered_price_per_unit: number
    total_quantity_bid: number
    bid_amount: number
    regional_bids?: {
      region: string
    }
  }
}

export default function FarmerBidsPage() {
  const [bidOffers, setBidOffers] = useState<BidConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    loadBidOffers()
  }, [])

  const loadBidOffers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: farmerData } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!farmerData) throw new Error('Farmer profile not found')

      const { data, error: err } = await supabase
        .from('bid_confirmations')
        .select('*, bids(offered_price_per_unit, total_quantity_bid, bid_amount, regional_bids(region))')
        .eq('farmer_id', farmerData.id)
        .order('id', { ascending: false })

      if (err) throw err
      setBidOffers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bid offers')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBid = async (bidConfirmationId: string) => {
    try {
      setConfirmingId(bidConfirmationId)
      const supabase = createClient()

      await supabase
        .from('bid_confirmations')
        .update({
          confirmation_status: 'confirmed',
          confirmation_timestamp: new Date().toISOString(),
        })
        .eq('id', bidConfirmationId)

      loadBidOffers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm bid')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRejectBid = async (bidConfirmationId: string) => {
    try {
      setConfirmingId(bidConfirmationId)
      const supabase = createClient()

      await supabase
        .from('bid_confirmations')
        .update({
          confirmation_status: 'rejected',
          confirmation_timestamp: new Date().toISOString(),
        })
        .eq('id', bidConfirmationId)

      loadBidOffers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject bid')
    } finally {
      setConfirmingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-blue-100 text-blue-800'
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bid Offers</h1>
        <p className="text-muted-foreground mt-2">
          Review and confirm bid offers from bulk buyers
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading bid offers...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : bidOffers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No bid offers yet. Keep checking for incoming bids!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bidOffers.map((offer) => (
            <Card key={offer.id} className={offer.confirmation_status === 'pending' ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {offer.bids?.regional_bids?.region || 'Unknown Region'}
                    </CardTitle>
                    <CardDescription>
                      Offered via {offer.notification_method.toUpperCase()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusBadge(offer.confirmation_status)}>
                    {offer.confirmation_status.charAt(0).toUpperCase() + offer.confirmation_status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Offered Price</p>
                    <p className="text-lg font-semibold">${offer.bids?.offered_price_per_unit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="text-lg font-semibold">{offer.bids?.total_quantity_bid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-lg font-semibold">${offer.bids?.bid_amount.toFixed(2)}</p>
                  </div>
                </div>

                {offer.confirmation_status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="default"
                      onClick={() => handleConfirmBid(offer.id)}
                      disabled={confirmingId === offer.id}
                      className="flex-1"
                    >
                      {confirmingId === offer.id ? 'Confirming...' : 'Confirm'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRejectBid(offer.id)}
                      disabled={confirmingId === offer.id}
                      className="flex-1"
                    >
                      {confirmingId === offer.id ? 'Processing...' : 'Reject'}
                    </Button>
                  </div>
                )}

                {offer.confirmation_timestamp && (
                  <p className="text-xs text-muted-foreground">
                    Updated on {new Date(offer.confirmation_timestamp).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
