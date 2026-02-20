const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing' })
    }

    const token = header.split(' ')[1]
    const secret = process.env.JWT_SECRET

    if (!secret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' })
    }

    const decoded = jwt.verify(token, secret)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware

