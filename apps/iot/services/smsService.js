const AfricasTalking = require('africastalking')
require('dotenv').config()

const AT = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey: process.env.AT_API_KEY
})

const sms = AT.SMS

const sendVerificationSMS = async (phoneNumber, listingId, cropType, riskLevel, verificationStatus) => {
  try {
    const riskEmoji = { LOW: '✓', MEDIUM: '⚠', HIGH: '✗' }

    const message = `Agri-D Ledger: Your ${cropType} listing (${listingId}) has been verified.\nRisk Level: ${riskEmoji[riskLevel]} ${riskLevel}\nStatus: ${verificationStatus}\n${riskLevel === 'LOW' ? 'Your produce is ready for buyers.' : riskLevel === 'MEDIUM' ? 'Please check storage conditions.' : 'Urgent: Improve storage conditions immediately.'}`

    const result = await sms.send({
      to: [phoneNumber],
      message: message
    })

    console.log('SMS notification sent:', JSON.stringify(result))
    return result
  } catch (error) {
    console.log('SMS notification error:', error.message)
  }
}

module.exports = { sendVerificationSMS }