const express = require('express')
const authMiddleware = require('../middleware/auth')
const {
  listWebhooks,
  createWebhook,
  toggleWebhook,
  deleteWebhook,
  listLogs,
} = require('../controllers/webhookController')

const router = express.Router()

router.use(authMiddleware)

router.get('/', listWebhooks)
router.post('/', createWebhook)
router.patch('/:id/toggle', toggleWebhook)
router.delete('/:id', deleteWebhook)
router.get('/logs', listLogs)

module.exports = router
