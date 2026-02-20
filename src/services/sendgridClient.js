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
          resolve({ statusCode: res.statusCode || 0, body: buf })
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

async function sendEmail(recipient, subject, text, html) {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    throw new Error('SendGrid not configured')
  }

  const url = 'https://api.sendgrid.com/v3/mail/send'

  const payload = {
    personalizations: [
      {
        to: [{ email: recipient }],
        subject,
      },
    ],
    from: { email: fromEmail },
    content: [
      {
        type: 'text/plain',
        value: text,
      },
    ],
  }

  if (html) {
    payload.content.push({
      type: 'text/html',
      value: html,
    })
  }

  const { statusCode, body } = await postJson(url, payload, {
    Authorization: `Bearer ${apiKey}`,
  })

  const ok = statusCode >= 200 && statusCode < 300
  return { ok, statusCode, body }
}

module.exports = {
  sendEmail,
}

