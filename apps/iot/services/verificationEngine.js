// Applies thresholds to sensor readings and classifies risk

const verifyMaize = (readings) => {
  const issues = []
  let riskLevel = 'LOW'

  // Moisture thresholds (most critical for maize)
  if (readings.moisture > 14) {
    issues.push(`High moisture: ${readings.moisture}% (safe: <13%)`)
    riskLevel = 'HIGH'
  } else if (readings.moisture >= 13) {
    issues.push(`Elevated moisture: ${readings.moisture}% (safe: <13%)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  }

  // Temperature thresholds
  if (readings.temperature > 30) {
    issues.push(`High temperature: ${readings.temperature}°C (safe: <30°C)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  } else if (readings.temperature < 10) {
    issues.push(`Low temperature: ${readings.temperature}°C (safe: >10°C)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  }

  // Humidity thresholds
  if (readings.humidity > 75) {
    issues.push(`High humidity: ${readings.humidity}% (safe: <75%)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  }

  return {
    riskLevel,
    issues,
    passed: riskLevel === 'LOW',
    thresholds: {
      moisture: '< 13% SAFE, 13-14% MEDIUM, > 14% HIGH',
      temperature: '10°C - 30°C SAFE',
      humidity: '< 75% SAFE'
    }
  }
}

const verifyPotatoes = (readings) => {
  const issues = []
  let riskLevel = 'LOW'

  // Temperature thresholds (most critical for potatoes)
  if (readings.temperature > 12) {
    issues.push(`High temperature: ${readings.temperature}°C (safe: 4-12°C)`)
    riskLevel = 'HIGH'
  } else if (readings.temperature < 4) {
    issues.push(`Low temperature: ${readings.temperature}°C (safe: 4-12°C)`)
    riskLevel = 'HIGH'
  } else if (readings.temperature > 10) {
    issues.push(`Elevated temperature: ${readings.temperature}°C (optimal: 4-10°C)`)
    riskLevel = 'MEDIUM'
  }

  // Humidity thresholds
  if (readings.humidity < 85) {
    issues.push(`Low humidity: ${readings.humidity}% (safe: 85-95%)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  } else if (readings.humidity > 95) {
    issues.push(`High humidity: ${readings.humidity}% (safe: 85-95%)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  }

  // Moisture thresholds
  if (readings.moisture < 75) {
    issues.push(`Low moisture: ${readings.moisture}% (safe: 75-85%)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  } else if (readings.moisture > 85) {
    issues.push(`High moisture: ${readings.moisture}% (safe: 75-85%)`)
    riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  }

  return {
    riskLevel,
    issues,
    passed: riskLevel === 'LOW',
    thresholds: {
      temperature: '4°C - 12°C SAFE',
      humidity: '85% - 95% SAFE',
      moisture: '75% - 85% SAFE'
    }
  }
}

const runVerification = (readings) => {
  const crop = readings.cropType.toLowerCase()

  if (crop === 'maize') {
    return verifyMaize(readings)
  } else if (crop === 'potatoes') {
    return verifyPotatoes(readings)
  } else {
    throw new Error(`No verification rules for crop: ${readings.cropType}`)
  }
}

module.exports = { runVerification }