const express = require('express')
const authMiddleware = require('../middleware/auth')
const { sendSingle, sendBulk, listMessages } = require('../controllers/smsController')

const router = express.Router()

router.use(authMiddleware)

router.post('/send', sendSingle)
router.post('/bulk', sendBulk)
router.get('/', listMessages)

module.exports = router

