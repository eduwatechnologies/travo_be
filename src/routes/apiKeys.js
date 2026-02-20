const express = require('express')
const authMiddleware = require('../middleware/auth')
const { listKeys, createKey, deleteKey } = require('../controllers/apiKeyController')

const router = express.Router()

router.use(authMiddleware)

router.get('/', listKeys)
router.post('/', createKey)
router.delete('/:id', deleteKey)

module.exports = router

