'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface Transaction {
  id: string
  produceId: string
  amount: number
  status: string
  createdAt: string
  produce?: {
    cropType: string
    quantityKg: number
    county: string
  }
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-100 text-red-800',
}

export default function BuyerTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/transactions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const { data } = await res.json()
        setTransactions(data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading transactions...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground mt-1">All your purchase transactions</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {transactions.length === 0 && !error ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No transactions yet. Place a bid to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {tx.produce?.cropType ?? 'Produce'} — {tx.produce?.county ?? ''}
                    </CardTitle>
                    <CardDescription>{new Date(tx.createdAt).toLocaleString()}</CardDescription>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[tx.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {tx.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {tx.produce && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span>{tx.produce.quantityKg} kg</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">KES {tx.amount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
