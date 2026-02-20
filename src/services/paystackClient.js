const https = require('https')

function postJson(urlString, body, headers) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString)
      const data = JSON.stringify(body)

      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
        timeout: 10000,
      }

      const req = https.request(options, (res) => {
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

function getJson(urlString, headers) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString)

      const options = {
        method: 'GET',
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        headers: {
          ...headers,
        },
        timeout: 10000,
      }

      const req = https.request(options, (res) => {
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

      req.end()
    } catch (err) {
      reject(err)
    }
  })
}

async function initializeTransaction(email, amountInNaira, reference, metadata, callbackUrl) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  const baseUrl = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'

  if (!secretKey) {
    throw new Error('Paystack not configured')
  }

  const url = `${baseUrl}/transaction/initialize`

  const payload = {
    email,
    amount: Math.round(amountInNaira * 100),
    reference,
    metadata,
  }

  if (callbackUrl) {
    payload.callback_url = callbackUrl
  }

  const { statusCode, body } = await postJson(url, payload, {
    Authorization: `Bearer ${secretKey}`,
  })

  const ok = statusCode >= 200 && statusCode < 300 && body && body.status === true
  return { ok, statusCode, body }
}

async function verifyTransaction(reference) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  const baseUrl = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'

  if (!secretKey) {
    throw new Error('Paystack not configured')
  }

  const url = `${baseUrl}/transaction/verify/${encodeURIComponent(reference)}`

  const { statusCode, body } = await getJson(url, {
    Authorization: `Bearer ${secretKey}`,
  })

  const ok = statusCode >= 200 && statusCode < 300 && body && body.status === true
  return { ok, statusCode, body }
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
}
