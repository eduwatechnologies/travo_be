const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

function buildUserResponse(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    companyName: user.companyName,
    createdAt: user.createdAt,
    plan: user.plan,
  }
}

function signToken(userId) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' })
}

async function register(req, res) {
  try {
    const { email, password, name, companyName } = req.body

    if (!email || !password || !name || !companyName) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      email,
      passwordHash,
      name,
      companyName,
    })

    const token = signToken(user._id.toString())

    return res.status(201).json({
      token,
      user: buildUserResponse(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed' })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken(user._id.toString())

    return res.json({
      token,
      user: buildUserResponse(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' })
  }
}

function me(req, res) {
  return res.json({
    user: buildUserResponse(req.user),
  })
}

module.exports = {
  register,
  login,
  me,
}

