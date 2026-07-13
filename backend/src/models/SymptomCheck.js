const mongoose = require('mongoose');

const symptomCheckSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Symptoms
  symptoms: [{
    name: {
      type: String,
      required: true,
    },
    severity: {
      type: Number, // 1-10 scale
      min: 1,
      max: 10,
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks', 'months'],
      },
    },
    location: String, // body part
    description: String,
  }],
  // Additional Information
  additionalInfo: {
    recentTravel: Boolean,
    recentIllnessContact: Boolean,
    allergies: [String],
    currentMedications: [String],
    preExistingConditions: [String],
  },
  // AI Analysis Results
  aiAnalysis: {
    possibleConditions: [{
      name: String,
      probability: Number, // percentage
      description: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical'],
      },
    }],
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      default: 'low',
    },
    recommendations: [{
      type: String,
    }],
    shouldSeeDoctor: Boolean,
    specialistRecommended: String,
    overallSeverityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  // Follow-up
  followUp: {
    required: { type: Boolean, default: false },
    date: Date,
    notes: String,
    doctorVisited: { type: Boolean, default: false },
    diagnosis: String,
    treatment: String,
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'resolved', 'ongoing', 'worsened'],
    default: 'active',
  },
  resolvedDate: Date,
  notes: String,
}, {
  timestamps: true,
});

// Index for efficient queries
symptomCheckSchema.index({ user: 1, date: -1 });
symptomCheckSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('SymptomCheck', symptomCheckSchema);
