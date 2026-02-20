const crypto = require('crypto')
const ApiKey = require('../models/ApiKey')

async function listKeys(req, res) {
  try {
    const userId = req.user._id
    const keys = await ApiKey.find({ user: userId }).sort({ createdAt: -1 })
    return res.json({ keys })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load API keys' })
  }
}

function generateKeyString() {
  const random = crypto.randomBytes(24).toString('base64url')
  return `sk_live_${random}`
}

async function createKey(req, res) {
  try {
    const userId = req.user._id
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    const keyString = generateKeyString()

    const apiKey = await ApiKey.create({
      user: userId,
      name,
      key: keyString,
    })

    return res.status(201).json({ key: apiKey })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create API key' })
  }
}

async function deleteKey(req, res) {
  try {
    const userId = req.user._id
    const { id } = req.params

    const existing = await ApiKey.findOne({ _id: id, user: userId })
    if (!existing) {
      return res.status(404).json({ message: 'API key not found' })
    }

    await existing.deleteOne()

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete API key' })
  }
}

module.exports = {
  listKeys,
  createKey,
  deleteKey,
}

