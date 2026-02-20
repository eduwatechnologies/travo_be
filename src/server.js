require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const connectDB = require('./config/db')
const apiRouter = require('./routes')

const app = express()

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000'

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
)
app.use(express.json())
app.use(morgan('dev'))

app.use('/api', apiRouter)

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
  })
})

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server listening on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error)
    process.exit(1)
  })
