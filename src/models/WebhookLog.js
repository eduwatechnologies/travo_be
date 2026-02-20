const mongoose = require('mongoose')

const webhookLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    webhook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    statusCode: {
      type: Number,
    },
    success: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
)

module.exports = mongoose.model('WebhookLog', webhookLogSchema)

