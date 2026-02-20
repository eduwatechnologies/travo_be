const EmailMessage = require('../models/EmailMessage')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { dispatchEvent } = require('../services/webhookDispatcher')
const { sendEmail: sendViaSendGrid } = require('../services/sendgridClient')

async function sendEmail(req, res) {
  try {
    const userId = req.user._id
    const { recipient, subject, message } = req.body

    if (!recipient || !subject || !message) {
      return res.status(400).json({ message: 'Recipient, subject and message are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const credits = 1
    if (user.creditsBalance < credits) {
      return res.status(400).json({ message: 'Insufficient credits' })
    }

    const provider = await sendViaSendGrid(recipient, subject, message, null)
    if (!provider.ok) {
      return res.status(502).json({ message: 'Failed to send email via provider' })
    }

    const email = await EmailMessage.create({
      user: userId,
      recipient,
      subject,
      message,
      status: 'sent',
    })

    user.creditsBalance -= credits
    await user.save()

    await Transaction.create({
      user: userId,
      type: 'usage',
      amount: 0,
      credits: -credits,
      description: `Email to ${recipient}`,
      status: 'completed',
    })

    dispatchEvent(userId, 'email.sent', {
      id: email._id.toString(),
      recipient,
      subject,
      status: email.status,
    }).catch(() => {})

    return res.status(201).json({ email })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send email' })
  }
}

async function listEmails(req, res) {
  try {
    const userId = req.user._id

    const emails = await EmailMessage.find({ user: userId }).sort({ createdAt: -1 })

    return res.json({ emails })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load emails' })
  }
}

module.exports = {
  sendEmail,
  listEmails,
}
