import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      senderId,
      recipientId,
      messageType,
      subject,
      messageContent,
      bidId,
      regionalBidId,
    } = body

    if (!senderId || !recipientId || !messageType || !subject || !messageContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('communications')
      .insert({
        sender_user_id: senderId,
        recipient_user_id: recipientId,
        message_type: messageType,
        subject,
        message_content: messageContent,
        bid_id: bidId || null,
        regional_bid_id: regionalBidId || null,
        sent_timestamp: new Date().toISOString(),
        read_status: false,
      })

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
