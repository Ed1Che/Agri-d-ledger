'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { Badge } from '@/components/ui/badge'
import { Sprout, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ProduceType {
  id: string
  name: string
  unit_of_measurement: string
}

interface FarmerProduce {
  id: string
  produce_type_id: string
  quantity_available: number
  asking_price_per_unit: number
  harvest_date: string
  quality_grade: string
  notes: string
  status?: string
  produce_types?: {
    name: string
    unit_of_measurement: string
  }
}

const GRADE_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800',
}

export default function FarmerDashboard() {
  const [produce, setProduce] = useState<FarmerProduce[]>([])
  const [produceTypes, setProduceTypes] = useState<ProduceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    produce_type_id: '',
    quantity_available: '',
    asking_price_per_unit: '',
    harvest_date: '',
    quality_grade: 'good',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
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

      const [{ data: types }, { data: produceData }] = await Promise.all([
        supabase.from('produce_types').select('*'),
        supabase
          .from('farmer_produce')
          .select('*, produce_types(name, unit_of_measurement)')
          .eq('farmer_id', farmerData.id)
          .order('created_at', { ascending: false }),
      ])

      setProduceTypes(types || [])
      setProduce(produceData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduce = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.produce_type_id || !formData.quantity_available || !formData.asking_price_per_unit) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: farmerData } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      const { error: insertErr } = await supabase
        .from('farmer_produce')
        .insert({
          farmer_id: farmerData?.id,
          produce_type_id: formData.produce_type_id,
          quantity_available: parseFloat(formData.quantity_available),
          unit_of_measurement: produceTypes.find(t => t.id === formData.produce_type_id)?.unit_of_measurement,
          asking_price_per_unit: parseFloat(formData.asking_price_per_unit),
          harvest_date: formData.harvest_date || null,
          quality_grade: formData.quality_grade,
          notes: formData.notes || null,
        })

      if (insertErr) throw insertErr

      setFormData({
        produce_type_id: '',
        quantity_available: '',
        asking_price_per_unit: '',
        harvest_date: '',
        quality_grade: 'good',
        notes: '',
      })
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add produce')
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Produce</h1>
          <p className="text-muted-foreground mt-1">Manage your agricultural products available for market</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? 'Cancel' : <><Plus className="h-4 w-4" />Add Produce</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Produce</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduce} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="produce">Produce Type <span aria-hidden>*</span></Label>
                  <select
                    id="produce"
                    value={formData.produce_type_id}
                    onChange={(e) => setFormData({ ...formData, produce_type_id: e.target.value })}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    aria-required="true"
                  >
                    <option value="">Select produce type</option>
                    {produceTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity Available <span aria-hidden>*</span></Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price">Asking Price per Unit (KES) <span aria-hidden>*</span></Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formData.asking_price_per_unit}
                    onChange={(e) => setFormData({ ...formData, asking_price_per_unit: e.target.value })}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="harvest">Harvest Date</Label>
                  <Input
                    id="harvest"
                    type="date"
                    value={formData.harvest_date}
                    onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grade">Quality Grade</Label>
                  <select
                    id="grade"
                    value={formData.quality_grade}
                    onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value })}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional information"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Spinner className="mr-2" />Adding...</> : 'Add Produce'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {produce.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sprout className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No produce listed yet</EmptyTitle>
            <EmptyDescription>
              Add your first product to get started selling on the marketplace.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />Add Your First Produce
          </Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {produce.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{item.produce_types?.name || 'Unknown'}</CardTitle>
                    <CardDescription>{item.produce_types?.unit_of_measurement}</CardDescription>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${GRADE_COLORS[item.quality_grade] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {item.quality_grade}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-semibold">
                      {item.quantity_available.toLocaleString()} {item.produce_types?.unit_of_measurement}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Asking Price</p>
                    <p className="font-semibold">KES {item.asking_price_per_unit.toLocaleString()}</p>
                  </div>
                </div>
                {item.harvest_date && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Harvest Date</p>
                    <p className="font-semibold">{new Date(item.harvest_date).toLocaleDateString()}</p>
                  </div>
                )}
                {item.notes && (
                  <p className="text-sm text-muted-foreground italic">{item.notes}</p>
                )}
                {item.status && (
                  <Badge variant={item.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
                    {item.status}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
