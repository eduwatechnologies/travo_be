const http = require('http')
const https = require('https')
const crypto = require('crypto')
const Webhook = require('../models/Webhook')
const WebhookLog = require('../models/WebhookLog')

function sendRequest(urlString, payload, headers = {}) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlString)
      const lib = url.protocol === 'https:' ? https : http
      const data = JSON.stringify(payload)

      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
        timeout: 10000,
      }

      const req = lib.request(options, (res) => {
        res.on('data', () => {})
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0 })
        })
      })

      req.on('error', () => {
        resolve({ statusCode: 0, error: 'request_error' })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ statusCode: 0, error: 'timeout' })
      })

      req.write(data)
      req.end()
    } catch {
      resolve({ statusCode: 0, error: 'invalid_url' })
    }
  })
}

async function dispatchEvent(userId, event, payload) {
  try {
    const webhooks = await Webhook.find({
      user: userId,
      isActive: true,
      events: event,
    })

    if (!webhooks.length) {
      return
    }

    const body = {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    }

    const secret = process.env.WEBHOOK_SECRET || 'travo_dev_secret'
    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')

    await Promise.all(
      webhooks.map(async (webhook) => {
        const result = await sendRequest(webhook.url, body, {
          'X-Travo-Event': event,
          'X-Travo-Signature': signature,
        })

        const statusCode = result.statusCode || 0
        const success = statusCode >= 200 && statusCode < 300

        await WebhookLog.create({
          user: userId,
          webhook: webhook._id,
          event,
          statusCode,
          success,
          errorMessage: result.error,
        })

        if (success) {
          webhook.lastTriggeredAt = new Date()
          await webhook.save()
        }
      })
    )
  } catch {
  }
}

module.exports = {
  dispatchEvent,
}

