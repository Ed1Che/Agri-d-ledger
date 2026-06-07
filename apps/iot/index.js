require('dotenv').config()
const express = require('express')
const cron = require('node-cron')
const iotRoutes = require('./routes/iotRoutes')
const { checkAndVerifyProduce } = require('./controllers/iotController')

const app = express()
const PORT = process.env.PORT || 3003

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/iot', iotRoutes)

// Base route
app.get('/', (req, res) => {
  res.send('Agri-D Ledger IoT Verification Service is running')
})

// Auto verification every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  console.log('--- Running scheduled verification check ---')
  await checkAndVerifyProduce()
})

// Start server
app.listen(PORT, () => {
  console.log(`IoT Service running on port ${PORT}`)
  console.log('Auto-verification scheduled every 30 seconds')
})