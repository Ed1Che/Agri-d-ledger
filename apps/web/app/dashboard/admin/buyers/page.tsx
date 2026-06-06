'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'

interface Buyer {
  id: string
  company_name: string
  contact_person: string
  phone_number: string
  email: string
  location_region: string
  created_at: string
}

export default function BuyerManagementPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [filteredBuyers, setFilteredBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBuyers()
  }, [])

  useEffect(() => {
    filterBuyers()
  }, [searchQuery, buyers])

  const loadBuyers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error: err } = await supabase
        .from('buyers')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setBuyers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buyers')
    } finally {
      setLoading(false)
    }
  }

  const filterBuyers = () => {
    let filtered = buyers

    if (searchQuery) {
      filtered = filtered.filter(buyer =>
        buyer.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.email?.includes(searchQuery) ||
        buyer.phone_number.includes(searchQuery)
      )
    }

    setFilteredBuyers(filtered)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Buyer Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage bulk buyer accounts
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Input
        placeholder="Search by company, contact, email or phone..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading buyers...</p>
        </div>
      ) : filteredBuyers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No buyers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Company</th>
                <th className="text-left py-3 px-4 font-semibold">Contact Person</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Phone</th>
                <th className="text-left py-3 px-4 font-semibold">Region</th>
                <th className="text-left py-3 px-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuyers.map(buyer => (
                <tr key={buyer.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">{buyer.company_name}</td>
                  <td className="py-3 px-4">{buyer.contact_person || '-'}</td>
                  <td className="py-3 px-4">{buyer.email || '-'}</td>
                  <td className="py-3 px-4">{buyer.phone_number}</td>
                  <td className="py-3 px-4">{buyer.location_region || '-'}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {new Date(buyer.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredBuyers.length} of {buyers.length} buyers
      </div>
    </div>
  )
}
