const express = require('express')
const router = express.Router()
const supabase = require('../config/supabaseClient')

/**
 * POST /api/listings
 * Called by the team backend (ML / IoT modules) to push listing updates
 * back into Supabase and (optionally) SMS the farmer via Africa's Talking.
 *
 * Body: { listingId, status, suggestedPrice?, riskLevel? }
 */
router.post('/listings', async (req, res) => {
  // Verify the request comes from the internal API
  const secret = process.env.INTERNAL_API_SECRET || ''
  if (secret && req.headers['x-internal-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { listingId, status, suggestedPrice, riskLevel } = req.body

  if (!listingId || !status) {
    return res.status(400).json({ error: 'listingId and status are required' })
  }

  const updatePayload = { status }
  if (suggestedPrice !== undefined) updatePayload.suggested_price = suggestedPrice
  if (riskLevel !== undefined) updatePayload.risk_level = riskLevel

  const { data, error } = await supabase
    .from('produce_listings')
    .update(updatePayload)
    .eq('listing_id', listingId)
    .select('phone_number, crop_type, quantity, asked_price')
    .single()

  if (error) {
    console.error('Listing update error:', error.message)
    return res.status(500).json({ error: 'database_error', message: error.message })
  }

  // Optional: SMS farmer via Africa's Talking when listing is verified
  if (status === 'verified' && data?.phone_number) {
    sendSmsNotification(data.phone_number, listingId, suggestedPrice).catch(
      (err) => console.error('SMS send failed (non-fatal):', err.message)
    )
  }

  return res.json({ ok: true, listingId, status })
})

async function sendSmsNotification(phoneNumber, listingId, suggestedPrice) {
  const AT_API_KEY = process.env.AT_API_KEY
  const AT_USERNAME = process.env.AT_USERNAME
  if (!AT_API_KEY || !AT_USERNAME) return

  const message = suggestedPrice
    ? `Agri-D Ledger: Your listing ${listingId} has been verified. Suggested price: KES ${suggestedPrice}/bag. Dial *384*# to view offers.`
    : `Agri-D Ledger: Your listing ${listingId} has been verified. Dial *384*# to view offers.`

  await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: AT_API_KEY,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ username: AT_USERNAME, to: phoneNumber, message }),
  })
}

module.exports = router
