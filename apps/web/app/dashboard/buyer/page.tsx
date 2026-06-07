'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { ShoppingBasket } from 'lucide-react'
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

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
}

export default function BuyerDashboard() {
  const [bids, setBids] = useState<RegionalBid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const router = useRouter()

  useEffect(() => { loadBids() }, [filter])

  const loadBids = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('regional_bids')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter === 'open') query = query.eq('status', 'open')

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
        <p className="text-muted-foreground mt-1">
          Browse and place bids on agricultural products from farmers across different regions
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'open' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('open')}
        >
          Open Bids
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Bids
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24" aria-live="polite">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : bids.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBasket className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No regional bids available</EmptyTitle>
            <EmptyDescription>
              {filter === 'open'
                ? 'There are no open bids right now. Check back later or view all bids.'
                : 'No bids have been created yet.'}
            </EmptyDescription>
          </EmptyHeader>
          {filter === 'open' && (
            <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
              View All Bids
            </Button>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bids.map((bid) => (
            <Card key={bid.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">{bid.region}</CardTitle>
                    <CardDescription>
                      {bid.participating_farmers_count} farmer{bid.participating_farmers_count !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[bid.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {bid.status}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Price</span>
                    <span className="font-semibold">KES {bid.average_price_per_unit.toLocaleString()}/unit</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-semibold">{bid.total_quantity_available.toLocaleString()} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Total Value</span>
                    <span className="font-semibold">
                      KES {(bid.average_price_per_unit * bid.total_quantity_available).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => router.push(`/dashboard/buyer/offers/${bid.id}`)}
                  className="w-full"
                  disabled={bid.status !== 'open'}
                  variant={bid.status === 'open' ? 'default' : 'outline'}
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
