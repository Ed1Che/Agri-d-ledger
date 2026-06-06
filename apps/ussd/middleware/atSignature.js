const crypto = require('crypto')

function validateAtSignature(req, res, next) {
  // Skip in development / sandbox
  if (process.env.NODE_ENV !== 'production') return next()

  const sig =
    req.headers['x-africastalking-signature-v2'] ||
    req.headers['x-africastalking-signature']

  if (!sig || !process.env.AT_API_KEY) {
    return res.status(401).send('END Unauthorized')
  }

  const payload = new URLSearchParams(req.body).toString()
  const hash = crypto
    .createHmac('sha256', process.env.AT_API_KEY)
    .update(payload)
    .digest('hex')

  if (hash !== sig) return res.status(401).send('END Unauthorized')
  next()
}

module.exports = { validateAtSignature }
