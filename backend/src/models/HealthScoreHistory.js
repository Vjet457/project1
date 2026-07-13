const mongoose = require('mongoose');

const healthScoreHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  overallHealthScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  remarks: {
    type: String,
  },
  riskCategory: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'needs-attention', 'critical'],
    default: 'fair',
  },
}, {
  timestamps: true,
});

healthScoreHistorySchema.index({ user: 1, date: -1 });
healthScoreHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('HealthScoreHistory', healthScoreHistorySchema);
