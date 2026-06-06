'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RegionalBid {
  id: string
  region: string
  average_price_per_unit: number
  total_quantity_available: number
  participating_farmers_count: number
  negotiation_threshold_percentage: number
  status: string
  bid_close_date?: string
}

interface Farmer {
  farmer_name: string
  location_region: string
}

export default function OfferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [bid, setBid] = useState<RegionalBid | null>(null)
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offeredPrice, setOfferedPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadOfferDetails()
  }, [])

  const loadOfferDetails = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: bidData, error: bidError } = await supabase
        .from('regional_bids')
        .select('*')
        .eq('id', params.id)
        .single()

      if (bidError) throw bidError
      setBid(bidData)

      // Load farmers participating in this bid
      const { data: farmerData, error: farmerError } = await supabase
        .from('regional_bid_farmers')
        .select('farmer_id, farmers(farmer_name, location_region)')
        .eq('regional_bid_id', params.id)

      if (farmerError) throw farmerError
      // Extract farmer data from nested response
      setFarmers(farmerData?.map((item: any) => item.farmers) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offer details')
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bid || !offeredPrice || !quantity) {
      setError('Please fill in all fields')
      return
    }

    try {
      setSubmitting(true)
      const supabase = createClient()

      // Get current user (buyer)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get buyer profile
      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (buyerError) throw buyerError

      const bidAmount = parseFloat(offeredPrice) * parseFloat(quantity)
      const deviation = ((parseFloat(offeredPrice) - bid.average_price_per_unit) / bid.average_price_per_unit) * 100

      // Check if deviation is within acceptable range
      if (Math.abs(deviation) > bid.negotiation_threshold_percentage) {
        setError(`Price deviation (${deviation.toFixed(2)}%) exceeds maximum negotiation threshold (${bid.negotiation_threshold_percentage}%)`)
        setSubmitting(false)
        return
      }

      // Create bid
      const { error: placeBidError } = await supabase
        .from('bids')
        .insert({
          regional_bid_id: bid.id,
          buyer_id: buyerData.id,
          offered_price_per_unit: parseFloat(offeredPrice),
          total_quantity_bid: parseFloat(quantity),
          bid_amount: bidAmount,
          negotiation_deviation_percentage: deviation,
          status: 'pending',
        })

      if (placeBidError) throw placeBidError

      // Show success and redirect
      alert('Bid placed successfully!')
      router.push('/dashboard/buyer/bids')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading offer details...</p>
      </div>
    )
  }

  if (error && !bid) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!bid) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Offer not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()}>
        Back to Offers
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{bid.region} - Regional Produce Offer</CardTitle>
              <CardDescription>
                Status: {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Market Price (per unit)</Label>
                  <p className="text-2xl font-bold text-primary">${bid.average_price_per_unit.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Available Quantity</Label>
                  <p className="text-2xl font-bold">{bid.total_quantity_available.toFixed(2)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Participating Farmers ({bid.participating_farmers_count})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {farmers.length > 0 ? (
                    farmers.map((farmer, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium">{farmer.farmer_name}</p>
                        <p className="text-muted-foreground text-xs">{farmer.location_region}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Farmer information loading...</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Place Your Bid</CardTitle>
              <CardDescription>
                Deviation allowed: ±{bid.negotiation_threshold_percentage}%
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Unit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-foreground">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={offeredPrice}
                      onChange={(e) => setOfferedPrice(e.target.value)}
                      className="pl-8"
                      disabled={bid.status !== 'open'}
                      required
                    />
                  </div>
                  {offeredPrice && bid.average_price_per_unit && (
                    <p className="text-xs text-muted-foreground">
                      {Math.abs(((parseFloat(offeredPrice) - bid.average_price_per_unit) / bid.average_price_per_unit) * 100).toFixed(2)}% from market price
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={bid.status !== 'open'}
                    required
                  />
                </div>

                {offeredPrice && quantity && (
                  <div className="bg-secondary p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Bid Amount</p>
                    <p className="text-2xl font-bold text-primary">
                      ${(parseFloat(offeredPrice) * parseFloat(quantity)).toFixed(2)}
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={bid.status !== 'open' || submitting}
                >
                  {submitting ? 'Placing Bid...' : 'Place Bid'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
