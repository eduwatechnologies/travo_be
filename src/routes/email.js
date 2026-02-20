const express = require('express')
const authMiddleware = require('../middleware/auth')
const { sendEmail, listEmails } = require('../controllers/emailController')

const router = express.Router()

router.use(authMiddleware)

router.post('/send', sendEmail)
router.get('/', listEmails)

module.exports = router

