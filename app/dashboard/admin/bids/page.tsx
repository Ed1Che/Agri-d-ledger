'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'

interface RegionalBid {
  id: string
  region: string
  average_price_per_unit: number
  total_quantity_available: number
  participating_farmers_count: number
  status: string
  created_at: string
}

interface ProduceType {
  id: string
  name: string
  category: string
}

export default function RegionalBidsPage() {
  const [bids, setBids] = useState<RegionalBid[]>([])
  const [produceTypes, setProduceTypes] = useState<ProduceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    region: '',
    produce_type_id: '',
    average_price_per_unit: '',
    total_quantity_available: '',
    negotiation_threshold_percentage: '5',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: bidsData } = await supabase
        .from('regional_bids')
        .select('*')
        .order('created_at', { ascending: false })

      setBids(bidsData || [])

      const { data: typesData } = await supabase
        .from('produce_types')
        .select('*')

      setProduceTypes(typesData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBid = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.region || !formData.produce_type_id || !formData.average_price_per_unit || !formData.total_quantity_available) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      const supabase = createClient()

      const { error: err } = await supabase
        .from('regional_bids')
        .insert({
          region: formData.region,
          produce_type_id: formData.produce_type_id,
          average_price_per_unit: parseFloat(formData.average_price_per_unit),
          total_quantity_available: parseFloat(formData.total_quantity_available),
          negotiation_threshold_percentage: parseFloat(formData.negotiation_threshold_percentage),
          status: 'open',
        })

      if (err) throw err

      setFormData({
        region: '',
        produce_type_id: '',
        average_price_per_unit: '',
        total_quantity_available: '',
        negotiation_threshold_percentage: '5',
      })
      setShowForm(false)
      setError(null)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bid')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredBids = filterStatus === 'all' 
    ? bids 
    : bids.filter(bid => bid.status === filterStatus)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Regional Bids</h1>
          <p className="text-muted-foreground mt-2">Create and manage regional produce bids</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create New Bid'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Regional Bid</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBid} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    placeholder="e.g., Central"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="produce">Produce Type</Label>
                  <select
                    id="produce"
                    value={formData.produce_type_id}
                    onChange={(e) => setFormData({ ...formData, produce_type_id: e.target.value })}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base w-full"
                    required
                  >
                    <option value="">Select produce</option>
                    {produceTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="price">Average Price per Unit</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.average_price_per_unit}
                    onChange={(e) => setFormData({ ...formData, average_price_per_unit: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Total Quantity Available</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.total_quantity_available}
                    onChange={(e) => setFormData({ ...formData, total_quantity_available: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="threshold">Negotiation Threshold %</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.01"
                    value={formData.negotiation_threshold_percentage}
                    onChange={(e) => setFormData({ ...formData, negotiation_threshold_percentage: e.target.value })}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Bid'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        {['all', 'open', 'closed', 'approved'].map(status => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            onClick={() => setFilterStatus(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading regional bids...</p>
        </div>
      ) : filteredBids.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No regional bids found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBids.map(bid => (
            <Card key={bid.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{bid.region}</CardTitle>
                    <CardDescription>
                      {bid.participating_farmers_count} participating farmers
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
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Market Price</span>
                  <span className="font-semibold">${bid.average_price_per_unit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available Quantity</span>
                  <span className="font-semibold">{bid.total_quantity_available.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-xs">{new Date(bid.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
