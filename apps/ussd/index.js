require('dotenv').config()
const express = require('express')
const ussdRoutes = require('./routes/ussdRoutes')

const app = express()
const PORT = process.env.PORT || 3002  // 3000=web, 3001=api, 3002=ussd

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Skip ngrok browser warning during local development
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true')
  next()
})

// Routes
app.use('/ussd', ussdRoutes)

// Internal webhook — called by the Express API to push listing updates
// (ML-suggested price, verification status) back to the USSD module so
// the farmer can be notified via SMS.
app.use('/api', require('./routes/listingRoutes'))

// Health check
app.get('/', (req, res) => {
  res.send('Agri-D Ledger USSD Server is running')
})

app.listen(PORT, () => {
  console.log(`USSD server running on port ${PORT}`)
})
