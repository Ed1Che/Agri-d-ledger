const crypto = require('crypto')

const generateReport = (produceId, readings, verification) => {
  const dataToHash = JSON.stringify({
    produceId,
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
    produceId,
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
