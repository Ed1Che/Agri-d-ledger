'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface LedgerEntry {
  id: string
  transactionId: string
  dataHash: string
  onChainHash: string
  blockNumber: string
  anchoredAt: string
  transaction?: {
    totalAmount: number
    status: string
  }
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const res = await fetch(`${apiUrl}/api/v1/ledger`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const { data } = await res.json()
        setEntries(data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ledger')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading ledger...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Blockchain Ledger</h1>
        <p className="text-muted-foreground mt-1">Immutable record of all verified transactions</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {entries.length === 0 && !error ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No ledger entries yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-mono truncate">{entry.dataHash}</CardTitle>
                <CardDescription>
                  {new Date(entry.anchoredAt).toLocaleString()}
                  {entry.blockNumber && ` · Block #${entry.blockNumber}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction</span>
                  <span className="font-mono text-xs">{entry.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On-chain hash</span>
                  <span className="font-mono text-xs truncate max-w-[60%]">{entry.onChainHash}</span>
                </div>
                {entry.transaction && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">KES {entry.transaction.totalAmount.toLocaleString()}</span>
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
