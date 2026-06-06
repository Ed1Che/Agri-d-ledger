const crypto = require('crypto')

const generateReport = (listingId, readings, verification) => {
  // Generate hash of sensor readings for blockchain
  const dataToHash = JSON.stringify({
    listingId,
    temperature: readings.temperature,
    humidity: readings.humidity,
    moisture: readings.moisture,
    weight: readings.weight,
    timestamp: readings.timestamp
  })

  const verificationHash = crypto
    .createHash('sha256')
    .update(dataToHash)
    .digest('hex')

  return {
    listingId,
    sensorId: readings.sensorId,
    cropType: readings.cropType,
    readings: {
      temperature: `${readings.temperature}°C`,
      humidity: `${readings.humidity}%`,
      moisture: `${readings.moisture}%`,
      weight: `${readings.weight}kg`
    },
    riskLevel: verification.riskLevel,
    verificationStatus: verification.passed ? 'VERIFIED SAFE' : 'FLAGGED',
    issues: verification.issues,
    thresholds: verification.thresholds,
    verificationHash,
    verifiedAt: new Date().toISOString()
  }
}

module.exports = { generateReport }