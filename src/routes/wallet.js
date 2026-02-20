const express = require('express')
const authMiddleware = require('../middleware/auth')
const {
  getSummary,
  getTransactions,
  purchaseCredits,
  verifyPaystack,
} = require('../controllers/walletController')

const router = express.Router()

router.use(authMiddleware)

router.get('/summary', getSummary)
router.get('/transactions', getTransactions)
router.post('/purchase', purchaseCredits)
router.get('/paystack/verify', verifyPaystack)

module.exports = router
