const supabase = require('../config/supabaseClient')
const { simulateSensorReadings } = require('../services/sensorSimulator')
const { runVerification } = require('../services/verificationEngine')
const { generateReport } = require('../services/reportGenerator')
const { sendVerificationSMS } = require('../services/smsService')

// Verify a single listing
const verifyListing = async (listing) => {
  try {
    console.log(`Verifying listing: ${listing.listing_id} (${listing.crop_type})`)

    // Step 1 - Simulate sensor readings
    const readings = simulateSensorReadings(listing.crop_type)
    console.log('Sensor readings:', readings)

    // Step 2 - Run verification
    const verification = runVerification(readings)
    console.log('Verification result:', verification.riskLevel)

    // Step 3 - Generate report with hash
    const report = generateReport(listing.listing_id, readings, verification)
    console.log('Verification hash:', report.verificationHash)

    // Step 4 - Save verification to Supabase
    const { error: verError } = await supabase
      .from('iot_verifications')
      .insert({
        verification_id: `VER-${Date.now()}`,
        listing_id: listing.listing_id,
        temperature: readings.temperature,
        humidity: readings.humidity,
        moisture: readings.moisture,
        weight: readings.weight,
        risk_level: verification.riskLevel,
        verification_status: report.verificationStatus,
        issues: JSON.stringify(verification.issues),
        verification_hash: report.verificationHash,
        verified_at: report.verifiedAt
      })

    if (verError) {
      console.log('Verification save error:', verError.message)
      return
    }

    // Step 5 - Update produce listing
    const { error: listError } = await supabase
      .from('produce_listings')
      .update({
        iot_verified: true,
        status: verification.passed ? 'verified' : 'flagged'
      })
      .eq('listing_id', listing.listing_id)

    if (listError) {
      console.log('Listing update error:', listError.message)
      return
    }

    console.log(`✓ Listing ${listing.listing_id} verified — Risk: ${verification.riskLevel}`)

// Send SMS to farmer
await sendVerificationSMS(
  listing.phone_number,
  listing.listing_id,
  listing.crop_type,
  verification.riskLevel,
  report.verificationStatus
)

return report

  } catch (error) {
    console.log('Verification error:', error.message)
  }
}

// Check for unverified listings and process them
const checkAndVerifyListings = async () => {
  try {
    const { data, error } = await supabase
      .from('produce_listings')
      .select('*')
      .eq('iot_verified', false)
      .eq('status', 'pending')
      .limit(10)

    if (error) {
      console.log('Fetch error:', error.message)
      return
    }

    if (!data || data.length === 0) {
      console.log('No pending listings to verify')
      return
    }

    console.log(`Found ${data.length} pending listing(s) to verify`)

    for (const listing of data) {
      await verifyListing(listing)
    }

  } catch (error) {
    console.log('Check error:', error.message)
  }
}

// Manual trigger endpoint
const triggerVerification = async (req, res) => {
  const { listingId } = req.params

  if (listingId) {
    // Verify specific listing
    const { data, error } = await supabase
      .from('produce_listings')
      .select('*')
      .eq('listing_id', listingId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const report = await verifyListing(data)
    return res.json({ success: true, report })
  }

  // Verify all pending
  await checkAndVerifyListings()
  res.json({ success: true, message: 'Verification triggered' })
}

// Get verification report for a listing
const getVerificationReport = async (req, res) => {
  const { listingId } = req.params

  const { data, error } = await supabase
    .from('iot_verifications')
    .select('*')
    .eq('listing_id', listingId)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'No verification found for this listing' })
  }

  res.json({ success: true, verification: data })
}

module.exports = {
  checkAndVerifyListings,
  triggerVerification,
  getVerificationReport
}