const http = require('http')
const https = require('https')
const { URL } = require('url')
const Webhook = require('../models/Webhook')
const WebhookLog = require('../models/WebhookLog')

async function sendWebhookRequest(webhook, event, payload) {
  return new Promise((resolve) => {
    try {
      const url = new URL(webhook.url)
      const isHttps = url.protocol === 'https:'
      const client = isHttps ? https : http

      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      })

      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }

      const request = client.request(options, (response) => {
        const statusCode = response.statusCode || 0
        response.resume()
        resolve({
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          error: null,
        })
      })

      request.on('error', (error) => {
        resolve({
          success: false,
          statusCode: 0,
          error: error.message,
        })
      })

      request.write(body)
      request.end()
    } catch (error) {
      resolve({
        success: false,
        statusCode: 0,
        error: error.message,
      })
    }
  })
}

async function dispatchWebhookEvent(userId, event, payload) {
  try {
    const webhooks = await Webhook.find({
      user: userId,
      isActive: true,
      events: event,
    })

    if (!webhooks.length) {
      return
    }

    await Promise.all(
      webhooks.map(async (webhook) => {
        const result = await sendWebhookRequest(webhook, event, payload)

        await WebhookLog.create({
          user: userId,
          webhook: webhook._id,
          event,
          statusCode: result.statusCode,
          success: result.success,
          errorMessage: result.error,
        })

        if (result.success) {
          webhook.lastTriggeredAt = new Date()
          await webhook.save()
        }
      })
    )
  } catch (error) {
  }
}

module.exports = {
  dispatchWebhookEvent,
}

