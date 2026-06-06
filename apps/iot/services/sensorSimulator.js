// Simulates realistic sensor readings for maize and potatoes
// Based on DHT22 (temp/humidity), YL-69 (moisture), HX711 (weight)

const simulateSensorReadings = (cropType) => {
  const crop = cropType.toLowerCase()

  if (crop === 'maize') {
    return {
      temperature: randomFloat(18, 32),      // DHT22 - Celsius
      humidity: randomFloat(50, 80),          // DHT22 - percentage
      moisture: randomFloat(10, 16),          // YL-69 - percentage
      weight: randomFloat(50, 500),           // HX711 - kg
      cropType: 'maize',
      timestamp: new Date().toISOString(),
      sensorId: `SENSOR-MAIZE-${Date.now()}`
    }
  } else if (crop === 'potatoes') {
    return {
      temperature: randomFloat(4, 15),        // DHT22 - Celsius
      humidity: randomFloat(85, 95),          // DHT22 - percentage
      moisture: randomFloat(75, 85),          // YL-69 - percentage
      weight: randomFloat(50, 500),           // HX711 - kg
      cropType: 'potatoes',
      timestamp: new Date().toISOString(),
      sensorId: `SENSOR-POTATO-${Date.now()}`
    }
  } else {
    throw new Error(`Unknown crop type: ${cropType}`)
  }
}

// Helper to generate random float between min and max
const randomFloat = (min, max) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}

module.exports = { simulateSensorReadings }