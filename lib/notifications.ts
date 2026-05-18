import { createClient } from '@/lib/supabase/server'

export type NotificationType = 'sms' | 'email' | 'in_app' | 'call'

export interface SendNotificationParams {
  senderId: string
  recipientId: string
  messageType: NotificationType
  subject: string
  messageContent: string
  bidId?: string
  regionalBidId?: string
}

export async function sendNotification(params: SendNotificationParams) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('communications')
    .insert({
      sender_user_id: params.senderId,
      recipient_user_id: params.recipientId,
      message_type: params.messageType,
      subject: params.subject,
      message_content: params.messageContent,
      bid_id: params.bidId || null,
      regional_bid_id: params.regionalBidId || null,
      sent_timestamp: new Date().toISOString(),
      read_status: false,
    })

  if (error) throw error

  return true
}

export async function sendBidConfirmationNotification(
  farmerId: string,
  buyerId: string,
  bidId: string,
  region: string,
  bidAmount: number
) {
  const supabase = await createClient()

  // Get buyer email
  const { data: buyerProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', buyerId)
    .single()

  const message = `A bid has been placed for produce in your region. 
Region: ${region}
Bid Amount: $${bidAmount.toFixed(2)}
Please review and confirm your participation.`

  await sendNotification({
    senderId: buyerId,
    recipientId: farmerId,
    messageType: 'in_app',
    subject: `New Bid Offer: ${region}`,
    messageContent: message,
    bidId: bidId,
  })
}

export async function sendBidConfirmedNotification(
  buyerId: string,
  farmerId: string,
  region: string
) {
  const message = `A farmer has confirmed their participation in your bid for ${region} produce.`

  await sendNotification({
    senderId: farmerId,
    recipientId: buyerId,
    messageType: 'in_app',
    subject: `Bid Confirmed: ${region}`,
    messageContent: message,
  })
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('communications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('read_status', false)

  return count || 0
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  await supabase
    .from('communications')
    .update({ read_status: true })
    .eq('id', notificationId)
}
