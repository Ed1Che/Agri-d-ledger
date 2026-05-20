'use client'

import { createClient } from '@/lib/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
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
  produce_types?: {
    name: string
    unit_of_measurement: string
  }
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get farmer profile
      const { data: farmerData } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!farmerData) throw new Error('Farmer profile not found')

      // Get produce types
      const { data: types } = await supabase
        .from('produce_types')
        .select('*')

      setProduceTypes(types || [])

      // Get farmer's produce
      const { data: produceData } = await supabase
        .from('farmer_produce')
        .select('*, produce_types(name, unit_of_measurement)')
        .eq('farmer_id', farmerData.id)
        .order('created_at', { ascending: false })

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
      const supabase = createClient()

      // Get farmer profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: farmerData } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!farmerData) throw new Error('Farmer profile not found')

      await supabase
        .from('farmer_produce')
        .insert({
          farmer_id: farmerData.id,
          produce_type_id: formData.produce_type_id,
          quantity_available: parseFloat(formData.quantity_available),
          unit_of_measurement: produceTypes.find(t => t.id === formData.produce_type_id)?.unit_of_measurement,
          asking_price_per_unit: parseFloat(formData.asking_price_per_unit),
          harvest_date: formData.harvest_date || null,
          quality_grade: formData.quality_grade,
          notes: formData.notes || null,
        })

      setFormData({
        produce_type_id: '',
        quantity_available: '',
        asking_price_per_unit: '',
        harvest_date: '',
        quality_grade: 'good',
        notes: '',
      })
      setShowForm(false)
      setError(null)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add produce')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Produce</h1>
          <p className="text-muted-foreground mt-2">Manage your agricultural products available for market</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Produce'}
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
                <div>
                  <Label htmlFor="produce">Produce Type</Label>
                  <select
                    id="produce"
                    value={formData.produce_type_id}
                    onChange={(e) => setFormData({ ...formData, produce_type_id: e.target.value })}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base w-full"
                    required
                  >
                    <option value="">Select produce type</option>
                    {produceTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity Available</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Asking Price per Unit</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.asking_price_per_unit}
                    onChange={(e) => setFormData({ ...formData, asking_price_per_unit: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="harvest">Harvest Date</Label>
                  <Input
                    id="harvest"
                    type="date"
                    value={formData.harvest_date}
                    onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Quality Grade</Label>
                  <select
                    id="grade"
                    value={formData.quality_grade}
                    onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value })}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base w-full"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional information"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Produce'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {produce.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No produce listed yet. Add your first product to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {produce.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.produce_types?.name || 'Unknown'}</CardTitle>
                <CardDescription>Quality: {item.quality_grade}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-semibold">{item.quantity_available} {item.produce_types?.unit_of_measurement}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Asking Price</p>
                    <p className="font-semibold">${item.asking_price_per_unit.toFixed(2)}</p>
                  </div>
                </div>
                {item.harvest_date && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Harvest Date</p>
                    <p className="font-semibold">{new Date(item.harvest_date).toLocaleDateString()}</p>
                  </div>
                )}
                {item.notes && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="text-sm">{item.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
