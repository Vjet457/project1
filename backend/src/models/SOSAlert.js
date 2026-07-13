const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Alert Timestamp
  triggeredAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
  
  // Location Details
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    accuracy: Number, // meters
    altitude: Number,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      formattedAddress: String,
    },
    landmark: String,
  },
  
  // Emergency Type
  emergencyType: {
    type: String,
    enum: [
      'medical',
      'accident',
      'cardiac',
      'breathing',
      'fall',
      'assault',
      'fire',
      'natural_disaster',
      'mental_health_crisis',
      'other'
    ],
    required: true,
  },
  
  // Severity Level
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high',
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['triggered', 'notifying', 'responded', 'resolved', 'cancelled', 'false_alarm'],
    default: 'triggered',
    index: true,
  },
  
  // User Condition (if provided)
  userCondition: {
    conscious: { type: Boolean },
    breathing: { type: Boolean },
    bleeding: { type: Boolean },
    description: String,
    vitalSigns: {
      heartRate: Number,
      bloodOxygen: Number,
    },
  },
  
  // Notification Log
  notifications: [{
    contactId: mongoose.Schema.Types.ObjectId,
    contactName: String,
    contactPhone: String,
    contactRelation: String,
    method: {
      type: String,
      enum: ['sms', 'call', 'push', 'email', 'whatsapp'],
    },
    sentAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'acknowledged'],
    },
    acknowledgedAt: Date,
    response: String,
  }],
  
  // Emergency Services
  emergencyServices: {
    called: { type: Boolean, default: false },
    service: {
      type: String,
      enum: ['ambulance', 'police', 'fire', 'all'],
    },
    calledAt: Date,
    dispatchId: String,
    eta: Number, // minutes
    arrivedAt: Date,
  },
  
  // Response Details
  response: {
    firstResponderId: mongoose.Schema.Types.ObjectId,
    firstResponderName: String,
    respondedAt: Date,
    actionsTaken: [String],
    hospitalName: String,
    hospitalAddress: String,
    admissionRequired: Boolean,
  },
  
  // Resolution
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: String,
      enum: ['user', 'contact', 'emergency_services', 'system'],
    },
    outcome: {
      type: String,
      enum: ['treated_onsite', 'hospitalized', 'false_alarm', 'cancelled', 'other'],
    },
    notes: String,
  },
  
  // Audio/Media (for evidence)
  media: [{
    type: { type: String, enum: ['audio', 'image', 'video'] },
    url: String,
    duration: Number, // seconds for audio/video
    capturedAt: Date,
  }],
  
  notes: String,
}, {
  timestamps: true,
});

// Geospatial index
sosAlertSchema.index({ location: '2dsphere' });
sosAlertSchema.index({ user: 1, triggeredAt: -1 });
sosAlertSchema.index({ status: 1, triggeredAt: -1 });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
