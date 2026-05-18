const express = require('express')
const router = express.Router()
const { handleUssd } = require('../controllers/ussdController')

// Africa's Talking posts to this URL
router.post('/callback', handleUssd)

// Health / verification endpoint
router.get('/callback', (req, res) => {
  res.send('USSD callback URL is active')
})

module.exports = router
