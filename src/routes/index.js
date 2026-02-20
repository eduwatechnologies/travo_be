const express = require('express')
const authRouter = require('./auth')
const walletRouter = require('./wallet')
const smsRouter = require('./sms')
const emailRouter = require('./email')
const apiKeysRouter = require('./apiKeys')
const webhooksRouter = require('./webhooks')

const router = express.Router()

router.use('/auth', authRouter)
router.use('/wallet', walletRouter)
router.use('/sms', smsRouter)
router.use('/email', emailRouter)
router.use('/api-keys', apiKeysRouter)
router.use('/webhooks', webhooksRouter)

router.get('/stats', (req, res) => {
  res.json({
    smsSent: 0,
    emailSent: 0,
    creditsRemaining: 0,
  })
})

module.exports = router
