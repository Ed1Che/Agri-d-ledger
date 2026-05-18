'use client'

import { createClient } from '@/lib/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface Farmer {
  id: string
  farmer_name: string
  phone_number: string
  location_region: string
  village_name: string
  farming_experience_years: number
  created_at: string
}

export default function FarmerManagementPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [regions, setRegions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFarmers()
  }, [])

  useEffect(() => {
    filterFarmers()
  }, [searchQuery, filterRegion, farmers])

  const loadFarmers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error: err } = await supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err

      setFarmers(data || [])

      // Extract unique regions
      const uniqueRegions = [...new Set((data || []).map(f => f.location_region))].sort()
      setRegions(uniqueRegions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farmers')
    } finally {
      setLoading(false)
    }
  }

  const filterFarmers = () => {
    let filtered = farmers

    if (searchQuery) {
      filtered = filtered.filter(farmer =>
        farmer.farmer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmer.phone_number.includes(searchQuery)
      )
    }

    if (filterRegion) {
      filtered = filtered.filter(farmer => farmer.location_region === filterRegion)
    }

    setFilteredFarmers(filtered)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Farmer Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage farmer profiles on the platform
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base w-full md:w-48"
        >
          <option value="">All Regions</option>
          {regions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading farmers...</p>
        </div>
      ) : filteredFarmers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No farmers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Phone</th>
                <th className="text-left py-3 px-4 font-semibold">Region</th>
                <th className="text-left py-3 px-4 font-semibold">Village</th>
                <th className="text-left py-3 px-4 font-semibold">Experience</th>
                <th className="text-left py-3 px-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredFarmers.map(farmer => (
                <tr key={farmer.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">{farmer.farmer_name}</td>
                  <td className="py-3 px-4">{farmer.phone_number}</td>
                  <td className="py-3 px-4">{farmer.location_region}</td>
                  <td className="py-3 px-4">{farmer.village_name || '-'}</td>
                  <td className="py-3 px-4">{farmer.farming_experience_years || '-'} years</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {new Date(farmer.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredFarmers.length} of {farmers.length} farmers
      </div>
    </div>
  )
}
