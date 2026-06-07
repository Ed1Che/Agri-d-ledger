const supabase = require('../config/supabaseClient')
const { simulateSensorReadings } = require('../services/sensorSimulator')
const { runVerification } = require('../services/verificationEngine')
const { generateReport } = require('../services/reportGenerator')
const { sendVerificationSMS } = require('../services/smsService')

// Verify a single produce entry
const verifyProduce = async (produce) => {
  try {
    const produceId = produce.id
    const produceTypeName = produce.produce_types?.name ?? 'unknown'
    const phoneNumber = produce.farmers?.phone_number

    console.log(`Verifying produce: ${produceId} (${produceTypeName})`)

    // Step 1 - Simulate sensor readings
    const readings = simulateSensorReadings(produceTypeName)
    console.log('Sensor readings:', readings)

    // Step 2 - Run verification
    const verification = runVerification(readings)
    console.log('Verification result:', verification.riskLevel)

    // Step 3 - Generate report with hash
    const report = generateReport(produceId, readings, verification)
    console.log('Verification hash:', report.verificationHash)

    // Step 4 - Save verification to Supabase
    const { error: verError } = await supabase
      .from('iot_verifications')
      .insert({
        verification_id: `VER-${Date.now()}`,
        produce_id: produceId,
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

    // Step 5 - Update farmer_produce
    const newStatus = verification.passed ? 'approved' : 'rejected'
    const { error: produceError } = await supabase
      .from('farmer_produce')
      .update({
        iot_verified: true,
        status: newStatus
      })
      .eq('id', produceId)

    if (produceError) {
      console.log('Produce update error:', produceError.message)
      return
    }

    console.log(`✓ Produce ${produceId} verified — Risk: ${verification.riskLevel}`)

    if (phoneNumber) {
      await sendVerificationSMS(
        phoneNumber,
        produceId,
        produceTypeName,
        verification.riskLevel,
        report.verificationStatus
      )
    }

    return report

  } catch (error) {
    console.log('Verification error:', error.message)
  }
}

// Check for unverified produce entries and process them
const checkAndVerifyProduce = async () => {
  try {
    const { data, error } = await supabase
      .from('farmer_produce')
      .select('*, produce_types(name), farmers(phone_number)')
      .eq('iot_verified', false)
      .eq('status', 'pending')
      .limit(10)

    if (error) {
      console.log('Fetch error:', error.message)
      return
    }

    if (!data || data.length === 0) {
      console.log('No pending produce to verify')
      return
    }

    console.log(`Found ${data.length} pending produce entry(s) to verify`)

    for (const produce of data) {
      await verifyProduce(produce)
    }

  } catch (error) {
    console.log('Check error:', error.message)
  }
}

// Manual trigger endpoint
const triggerVerification = async (req, res) => {
  const { produceId } = req.params

  if (produceId) {
    const { data, error } = await supabase
      .from('farmer_produce')
      .select('*, produce_types(name), farmers(phone_number)')
      .eq('id', produceId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Produce not found' })
    }

    const report = await verifyProduce(data)
    return res.json({ success: true, report })
  }

  await checkAndVerifyProduce()
  res.json({ success: true, message: 'Verification triggered' })
}

// Get verification report for a produce entry
const getVerificationReport = async (req, res) => {
  const { produceId } = req.params

  const { data, error } = await supabase
    .from('iot_verifications')
    .select('*')
    .eq('produce_id', produceId)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'No verification found for this produce' })
  }

  res.json({ success: true, verification: data })
}

module.exports = {
  checkAndVerifyProduce,
  triggerVerification,
  getVerificationReport
}
