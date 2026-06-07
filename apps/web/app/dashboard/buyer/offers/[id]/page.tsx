'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, CheckCircle } from 'lucide-react'
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
  const [success, setSuccess] = useState(false)

  useEffect(() => { loadOfferDetails() }, [])

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

      const { data: farmerData } = await supabase
        .from('regional_bid_farmers')
        .select('farmer_id, farmers(farmer_name, location_region)')
        .eq('regional_bid_id', params.id)

      setFarmers(farmerData?.map((item: any) => item.farmers).filter(Boolean) || [])
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

    const price = parseFloat(offeredPrice)
    const qty = parseFloat(quantity)
    const deviation = ((price - bid.average_price_per_unit) / bid.average_price_per_unit) * 100

    if (Math.abs(deviation) > bid.negotiation_threshold_percentage) {
      setError(
        `Price deviation (${deviation.toFixed(2)}%) exceeds the maximum negotiation threshold of ±${bid.negotiation_threshold_percentage}%`
      )
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (buyerError) throw buyerError

      const { error: placeBidError } = await supabase
        .from('bids')
        .insert({
          regional_bid_id: bid.id,
          buyer_id: buyerData.id,
          offered_price_per_unit: price,
          total_quantity_bid: qty,
          bid_amount: price * qty,
          negotiation_deviation_percentage: deviation,
          status: 'pending',
        })

      if (placeBidError) throw placeBidError

      setSuccess(true)
      setTimeout(() => router.push('/dashboard/buyer/bids'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" aria-live="polite">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (error && !bid) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!bid) return null

  const price = parseFloat(offeredPrice)
  const qty = parseFloat(quantity)
  const deviationPct = offeredPrice && bid
    ? ((price - bid.average_price_per_unit) / bid.average_price_per_unit) * 100
    : 0

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />Back to Offers
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{bid.region} — Regional Produce Offer</CardTitle>
              <CardDescription className="capitalize">Status: {bid.status}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Market Price (per unit)</p>
                  <p className="text-2xl font-bold text-primary">
                    KES {bid.average_price_per_unit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Quantity</p>
                  <p className="text-2xl font-bold">{bid.total_quantity_available.toLocaleString()} units</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Negotiation Window</p>
                  <p className="text-lg font-semibold">±{bid.negotiation_threshold_percentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Participating Farmers</p>
                  <p className="text-lg font-semibold">{bid.participating_farmers_count}</p>
                </div>
              </div>

              {farmers.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Participating Farmers</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {farmers.map((farmer, idx) => (
                      <div key={idx} className="px-3 py-2 bg-muted rounded-lg text-sm">
                        <p className="font-medium">{farmer.farmer_name}</p>
                        <p className="text-muted-foreground text-xs">{farmer.location_region}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Place Your Bid</CardTitle>
              <CardDescription>Deviation allowed: ±{bid.negotiation_threshold_percentage}%</CardDescription>
            </CardHeader>

            <CardContent>
              {success ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600" aria-hidden />
                  <p className="font-semibold">Bid placed successfully!</p>
                  <p className="text-sm text-muted-foreground">Redirecting to your bids...</p>
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price per Unit (KES)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={offeredPrice}
                      onChange={(e) => { setOfferedPrice(e.target.value); setError(null) }}
                      disabled={bid.status !== 'open'}
                      required
                    />
                    {offeredPrice && (
                      <p className={`text-xs ${Math.abs(deviationPct) > bid.negotiation_threshold_percentage ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {deviationPct > 0 ? '+' : ''}{deviationPct.toFixed(2)}% from market price
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity (units)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={bid.status !== 'open'}
                      required
                    />
                  </div>

                  {offeredPrice && quantity && !isNaN(price) && !isNaN(qty) && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Bid Amount</p>
                      <p className="text-2xl font-bold text-primary">
                        KES {(price * qty).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={bid.status !== 'open' || submitting}
                  >
                    {submitting ? <><Spinner className="mr-2" />Placing Bid...</> : 'Place Bid'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
