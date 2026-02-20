const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { initializeTransaction, verifyTransaction } = require('../services/paystackClient')

async function getSummary(req, res) {
  try {
    const userId = req.user._id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const usageTransactions = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'usage',
          createdAt: { $gte: startOfMonth },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$credits' },
        },
      },
    ])

    const creditsUsedThisMonth =
      usageTransactions.length > 0 ? Math.abs(usageTransactions[0].totalCredits) : 0

    return res.json({
      creditsRemaining: user.creditsBalance,
      creditsUsedThisMonth,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load wallet summary' })
  }
}

async function getTransactions(req, res) {
  try {
    const userId = req.user._id

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })

    return res.json({
      transactions,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load transactions' })
  }
}

async function purchaseCredits(req, res) {
  try {
    const userId = req.user._id
    const { amount } = req.body

    const parsedAmount = Number(amount)

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const reference = `wallet_${userId}_${Date.now()}`

    const callbackBase = process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
    const callbackUrl = `${callbackBase}/wallet/callback`

    const init = await initializeTransaction(
      user.email,
      parsedAmount,
      reference,
      {
        userId: userId.toString(),
        type: 'wallet_topup',
      },
      callbackUrl
    )

    if (!init.ok) {
      return res.status(502).json({ message: 'Failed to initialize payment' })
    }

    const data = init.body && init.body.data ? init.body.data : {}

    await Transaction.create({
      user: userId,
      type: 'purchase',
      amount: parsedAmount,
      credits: parsedAmount * 100,
      description: `Wallet top-up via Paystack (${reference})`,
      status: 'pending',
    })

    return res.status(201).json({
      reference,
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to purchase credits' })
  }
}

async function verifyPaystack(req, res) {
  try {
    const userId = req.user._id
    const { reference } = req.query

    if (!reference) {
      return res.status(400).json({ message: 'Reference is required' })
    }

    const verification = await verifyTransaction(String(reference))

    if (!verification.ok || !verification.body || !verification.body.data) {
      return res.status(502).json({ message: 'Failed to verify payment' })
    }

    const data = verification.body.data

    if (data.status !== 'success') {
      return res.status(400).json({ message: 'Payment not successful' })
    }

    const amountPaidNaira = data.amount / 100

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const credits = amountPaidNaira * 100

    user.creditsBalance += credits
    await user.save()

    const transaction = await Transaction.create({
      user: userId,
      type: 'purchase',
      amount: amountPaidNaira,
      credits,
      description: `Wallet top-up confirmed (${reference})`,
      status: 'completed',
    })

    return res.json({
      creditsRemaining: user.creditsBalance,
      transaction,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify payment' })
  }
}

module.exports = {
  getSummary,
  getTransactions,
  purchaseCredits,
  verifyPaystack,
}
