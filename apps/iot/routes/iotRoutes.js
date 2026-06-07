const express = require('express')
const router = express.Router()
const {
  triggerVerification,
  getVerificationReport
} = require('../controllers/iotController')

// Trigger verification for all pending produce
router.post('/verify', triggerVerification)

// Trigger verification for a specific produce entry
router.post('/verify/:produceId', triggerVerification)

// Get verification report for a produce entry
router.get('/report/:produceId', getVerificationReport)

module.exports = router