'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface Notification {
  id: string
  message_type: string
  subject: string
  message_content: string
  read_status: boolean
  sent_timestamp: string
}

export default function BuyerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: err } = await supabase
        .from('communications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('sent_timestamp', { ascending: false })

      if (err) throw err
      setNotifications(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('communications')
        .update({ read_status: true })
        .eq('id', notificationId)

      loadNotifications()
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return '📱'
      case 'email':
        return '📧'
      case 'in_app':
        return '🔔'
      case 'call':
        return '☎️'
      default:
        return '📬'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated on bid confirmations and important alerts
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <Card key={notif.id} className={notif.read_status ? '' : 'border-primary'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{getTypeIcon(notif.message_type)}</span>
                      <CardTitle className="text-base">{notif.subject}</CardTitle>
                      {!notif.read_status && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      {new Date(notif.sent_timestamp).toLocaleDateString()} at{' '}
                      {new Date(notif.sent_timestamp).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{notif.message_content}</p>
                {!notif.read_status && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead(notif.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
