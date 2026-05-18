'use client'

import { createClient } from '@/lib/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RegionalBid {
  id: string
  region: string
  average_price_per_unit: number
  total_quantity_available: number
  participating_farmers_count: number
  status: string
  produce_type?: string
  bid_close_date?: string
}

export default function BuyerDashboard() {
  const [bids, setBids] = useState<RegionalBid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const router = useRouter()

  useEffect(() => {
    loadBids()
  }, [filter])

  const loadBids = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('regional_bids')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (filter === 'open') {
        query = query.eq('status', 'open')
      }

      const { data, error: err } = await query

      if (err) throw err
      setBids(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Regional Produce Offers</h1>
        <p className="text-muted-foreground mt-2">
          Browse and place bids on agricultural products from farmers across different regions
        </p>
      </div>

      <div className="flex gap-4">
        <Button
          variant={filter === 'open' ? 'default' : 'outline'}
          onClick={() => setFilter('open')}
        >
          Open Bids
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Bids
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading regional offers...</p>
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
            <p className="text-muted-foreground">No regional bids available at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bids.map((bid) => (
            <Card key={bid.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{bid.region}</CardTitle>
                    <CardDescription>
                      {bid.participating_farmers_count} farmers
                    </CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    bid.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : bid.status === 'closed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Price</span>
                    <span className="font-semibold">${bid.average_price_per_unit.toFixed(2)}/unit</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-semibold">{bid.total_quantity_available.toFixed(2)} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Total</span>
                    <span className="font-semibold">
                      ${(bid.average_price_per_unit * bid.total_quantity_available).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => router.push(`/dashboard/buyer/offers/${bid.id}`)}
                  className="w-full"
                  disabled={bid.status !== 'open'}
                >
                  {bid.status === 'open' ? 'View & Bid' : 'View Details'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
