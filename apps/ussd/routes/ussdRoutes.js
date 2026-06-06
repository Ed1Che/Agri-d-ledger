const express = require('express')
const router = express.Router()
const { handleUssd } = require('../controllers/ussdController')
const { validateAtSignature } = require('../middleware/atSignature')

// Africa's Talking posts to this URL
router.post('/callback', validateAtSignature, handleUssd)

// Health / verification endpoint
router.get('/callback', (req, res) => {
  res.send('USSD callback URL is active')
})

module.exports = router
