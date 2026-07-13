const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      'reminder',
      'alert',
      'health_tip',
      'medication_reminder',
      'appointment_reminder',
      'water_reminder',
      'exercise_reminder',
      'sleep_reminder',
      'mood_check',
      'symptom_followup',
      'health_insight',
      'achievement',
      'emergency_update',
      'system',
      'promotional'
    ],
    required: true,
    index: true,
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  
  // Rich Content
  content: {
    body: String,
    imageUrl: String,
    actionUrl: String,
    actionText: String,
    data: mongoose.Schema.Types.Mixed, // Additional JSON data
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  
  // Scheduling
  scheduledFor: {
    type: Date,
    index: true,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
    },
    interval: Number, // e.g., every 2 days
    daysOfWeek: [Number], // 0-6, Sunday-Saturday
    time: String, // HH:MM
    endDate: Date,
  },
  
  // Delivery Status
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Timestamps
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  
  // Delivery Channels
  channels: [{
    type: {
      type: String,
      enum: ['push', 'email', 'sms', 'in_app'],
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
    },
    sentAt: Date,
    error: String,
  }],
  
  // User Interaction
  interaction: {
    clicked: { type: Boolean, default: false },
    clickedAt: Date,
    dismissed: { type: Boolean, default: false },
    dismissedAt: Date,
    actionTaken: String,
  },
  
  // Related Entity
  relatedTo: {
    entityType: {
      type: String,
      enum: ['symptom_check', 'health_record', 'appointment', 'medication', 'goal', 'achievement'],
    },
    entityId: mongoose.Schema.Types.ObjectId,
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    index: true,
  },
  
  // Metadata
  metadata: {
    source: String,
    campaign: String,
    tags: [String],
  },
}, {
  timestamps: true,
});

// Indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, status: 1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

// TTL index to auto-delete old notifications (optional - 90 days)
// notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
