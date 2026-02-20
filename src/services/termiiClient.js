const http = require('http')
const https = require('https')

function postJson(urlString, body) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString)
      const lib = url.protocol === 'https:' ? https : http
      const data = JSON.stringify(body)

      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 10000,
      }

      const req = lib.request(options, (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const buf = Buffer.concat(chunks).toString('utf8')
          try {
            const parsed = buf ? JSON.parse(buf) : {}
            resolve({ statusCode: res.statusCode || 0, body: parsed })
          } catch {
            resolve({ statusCode: res.statusCode || 0, body: null })
          }
        })
      })

      req.on('error', (err) => {
        reject(err)
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error('timeout'))
      })

      req.write(data)
      req.end()
    } catch (err) {
      reject(err)
    }
  })
}

async function sendSingleSms(to, text, from) {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = from || process.env.TERMII_SENDER_ID
  const baseUrl = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com'

  if (!apiKey || !senderId) {
    throw new Error('Termii not configured')
  }

  const url = `${baseUrl}/api/sms/send`
  const payload = {
    api_key: apiKey,
    to,
    from: senderId,
    sms: text,
    type: 'plain',
    channel: 'generic',
  }

  const { statusCode, body } = await postJson(url, payload)

  const ok = statusCode >= 200 && statusCode < 300
  return { ok, statusCode, body }
}

async function sendBulkSms(toList, text, from) {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = from || process.env.TERMII_SENDER_ID
  const baseUrl = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com'

  if (!apiKey || !senderId) {
    throw new Error('Termii not configured')
  }

  const url = `${baseUrl}/api/sms/send/bulk`
  const payload = {
    api_key: apiKey,
    to: toList,
    from: senderId,
    sms: text,
    type: 'plain',
    channel: 'generic',
  }

  const { statusCode, body } = await postJson(url, payload)

  const ok = statusCode >= 200 && statusCode < 300
  return { ok, statusCode, body }
}

module.exports = {
  sendSingleSms,
  sendBulkSms,
}

