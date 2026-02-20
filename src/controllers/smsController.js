const SmsMessage = require('../models/SmsMessage')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { dispatchEvent } = require('../services/webhookDispatcher')
const { sendSingleSms, sendBulkSms } = require('../services/termiiClient')

async function sendSingle(req, res) {
  try {
    const userId = req.user._id
    const { phone, message, senderId } = req.body

    if (!phone || !message || !senderId) {
      return res.status(400).json({ message: 'Phone, message and senderId are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const credits = 1
    if (user.creditsBalance < credits) {
      return res.status(400).json({ message: 'Insufficient credits' })
    }

    try {
      const provider = await sendSingleSms(phone, message, senderId)
      if (!provider.ok) {
        return res.status(502).json({ message: 'Failed to send SMS via provider' })
      }
    } catch (err) {
      return res.status(502).json({ message: 'Failed to send SMS via provider' })
    }

    const sms = await SmsMessage.create({
      user: userId,
      phone,
      message,
      senderId,
      status: 'sent',
      credits,
    })

    user.creditsBalance -= credits
    await user.save()

    await Transaction.create({
      user: userId,
      type: 'usage',
      amount: 0,
      credits: -credits,
      description: `SMS to ${phone}`,
      status: 'completed',
    })

    dispatchEvent(userId, 'sms.sent', {
      id: sms._id.toString(),
      phone,
      senderId,
      status: sms.status,
    }).catch(() => {})

    return res.status(201).json({ sms })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send SMS' })
  }
}

async function sendBulk(req, res) {
  try {
    const userId = req.user._id
    const { phones, message, senderId } = req.body

    if (!Array.isArray(phones) || phones.length === 0 || !message || !senderId) {
      return res.status(400).json({ message: 'Phones, message and senderId are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const credits = phones.length
    if (user.creditsBalance < credits) {
      return res.status(400).json({ message: 'Insufficient credits' })
    }

    try {
      const provider = await sendBulkSms(phones, message, senderId)
      if (!provider.ok) {
        return res.status(502).json({ message: 'Failed to send bulk SMS via provider' })
      }
    } catch (err) {
      return res.status(502).json({ message: 'Failed to send bulk SMS via provider' })
    }

    const now = new Date()

    const messages = phones.map((phone) => ({
      user: userId,
      phone,
      message,
      senderId,
      status: 'sent',
      credits: 1,
      createdAt: now,
      updatedAt: now,
    }))

    const inserted = await SmsMessage.insertMany(messages)

    user.creditsBalance -= credits
    await user.save()

    await Transaction.create({
      user: userId,
      type: 'usage',
      amount: 0,
      credits: -credits,
      description: `Bulk SMS to ${phones.length} recipients`,
      status: 'completed',
    })

    dispatchEvent(userId, 'sms.sent', {
      bulk: true,
      count: phones.length,
    }).catch(() => {})

    return res.status(201).json({ sms: inserted })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send bulk SMS' })
  }
}

async function listMessages(req, res) {
  try {
    const userId = req.user._id

    const sms = await SmsMessage.find({ user: userId }).sort({ createdAt: -1 })

    return res.json({ sms })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load SMS messages' })
  }
}

module.exports = {
  sendSingle,
  sendBulk,
  listMessages,
}
