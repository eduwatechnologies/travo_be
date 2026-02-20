const Webhook = require('../models/Webhook')
const WebhookLog = require('../models/WebhookLog')

async function listWebhooks(req, res) {
  try {
    const userId = req.user._id
    const webhooks = await Webhook.find({ user: userId }).sort({ createdAt: -1 })
    return res.json({ webhooks })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load webhooks' })
  }
}

async function createWebhook(req, res) {
  try {
    const userId = req.user._id
    const { url, events } = req.body

    if (!url || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: 'Url and events are required' })
    }

    const webhook = await Webhook.create({
      user: userId,
      url,
      events,
    })

    return res.status(201).json({ webhook })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create webhook' })
  }
}

async function toggleWebhook(req, res) {
  try {
    const userId = req.user._id
    const { id } = req.params

    const webhook = await Webhook.findOne({ _id: id, user: userId })
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    webhook.isActive = !webhook.isActive
    await webhook.save()

    return res.json({ webhook })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update webhook' })
  }
}

async function deleteWebhook(req, res) {
  try {
    const userId = req.user._id
    const { id } = req.params

    const webhook = await Webhook.findOne({ _id: id, user: userId })
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    await webhook.deleteOne()

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete webhook' })
  }
}

async function listLogs(req, res) {
  try {
    const userId = req.user._id

    const logs = await WebhookLog.find({ user: userId })
      .populate('webhook')
      .sort({ createdAt: -1 })
      .limit(50)

    return res.json({
      logs: logs.map((log) => ({
        _id: log._id,
        event: log.event,
        statusCode: log.statusCode,
        success: log.success,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
        webhook: log.webhook
          ? {
              _id: log.webhook._id,
              url: log.webhook.url,
            }
          : null,
      })),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load webhook logs' })
  }
}

module.exports = {
  listWebhooks,
  createWebhook,
  toggleWebhook,
  deleteWebhook,
  listLogs,
}
