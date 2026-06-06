const express = require('express')
const router = express.Router()
const {
  triggerVerification,
  getVerificationReport
} = require('../controllers/iotController')

// Trigger verification for all pending listings
router.post('/verify', triggerVerification)

// Trigger verification for a specific listing
router.post('/verify/:listingId', triggerVerification)

// Get verification report for a listing
router.get('/report/:listingId', getVerificationReport)

module.exports = router