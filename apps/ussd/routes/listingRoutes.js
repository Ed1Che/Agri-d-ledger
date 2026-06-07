const express = require('express')
const router = express.Router()
const supabase = require('../config/supabaseClient')

/**
 * POST /api/listings
 * Called by the team backend (ML / IoT modules) to push produce updates
 * back into Supabase and (optionally) SMS the farmer via Africa's Talking.
 *
 * Body: { produceId, status, suggestedPrice?, riskLevel? }
 */
router.post('/listings', async (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET || ''
  if (secret && req.headers['x-internal-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { produceId, status, suggestedPrice, riskLevel } = req.body

  if (!produceId || !status) {
    return res.status(400).json({ error: 'produceId and status are required' })
  }

  const updatePayload = { status }
  if (suggestedPrice !== undefined) updatePayload.suggested_price = suggestedPrice

  const { data, error } = await supabase
    .from('farmer_produce')
    .update(updatePayload)
    .eq('id', produceId)
    .select('farmers(phone_number), produce_types(name), quantity_available, asking_price_per_unit')
    .single()

  if (error) {
    console.error('Produce update error:', error.message)
    return res.status(500).json({ error: 'database_error', message: error.message })
  }

  // Optional: SMS farmer via Africa's Talking when produce is approved
  if (status === 'approved' && data?.farmers?.phone_number) {
    sendSmsNotification(
      data.farmers.phone_number,
      produceId,
      data.produce_types?.name,
      suggestedPrice
    ).catch((err) => console.error('SMS send failed (non-fatal):', err.message))
  }

  return res.json({ ok: true, produceId, status })
})

async function sendSmsNotification(phoneNumber, produceId, cropName, suggestedPrice) {
  const AT_API_KEY = process.env.AT_API_KEY
  const AT_USERNAME = process.env.AT_USERNAME
  if (!AT_API_KEY || !AT_USERNAME) return

  const ref = produceId.slice(0, 8).toUpperCase()
  const message = suggestedPrice
    ? `Agri-D Ledger: Your ${cropName} listing (${ref}) has been verified. Suggested price: KES ${suggestedPrice}/bag. Dial *384*# to view offers.`
    : `Agri-D Ledger: Your ${cropName} listing (${ref}) has been verified. Dial *384*# to view offers.`

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
