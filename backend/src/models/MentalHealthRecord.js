const mongoose = require('mongoose');

const mentalHealthRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Mood Tracking
  mood: {
    overall: {
      type: Number, // 1-10 scale
      min: 1,
      max: 10,
      required: true,
    },
    emotions: [{
      type: String,
      enum: ['happy', 'sad', 'anxious', 'calm', 'stressed', 'excited', 'angry', 'peaceful', 'confused', 'hopeful', 'grateful', 'lonely', 'content', 'overwhelmed'],
    }],
    notes: String,
  },
  // Stress & Anxiety
  stressLevel: {
    type: Number, // 1-5 scale
    min: 1,
    max: 5,
  },
  anxietyLevel: {
    type: Number, // 1-5 scale
    min: 1,
    max: 5,
  },
  // Energy & Motivation
  energyLevel: {
    type: Number, // 1-5 scale
    min: 1,
    max: 5,
  },
  motivationLevel: {
    type: Number, // 1-5 scale
    min: 1,
    max: 5,
  },
  // Sleep Impact
  sleepQuality: {
    type: Number, // 1-5 scale
    min: 1,
    max: 5,
  },
  sleepHours: {
    type: Number,
    min: 0,
    max: 24,
  },
  // Social & Lifestyle
  socialInteraction: {
    type: String,
    enum: ['isolated', 'minimal', 'moderate', 'active', 'very_active'],
  },
  exerciseImpact: {
    type: String,
    enum: ['none', 'light', 'moderate', 'intense'],
  },
  // Wellness Activities
  activities: {
    meditation: {
      practiced: { type: Boolean, default: false },
      duration: Number, // minutes
    },
    journaling: {
      practiced: { type: Boolean, default: false },
      entry: String,
    },
    breathingExercises: {
      practiced: { type: Boolean, default: false },
      duration: Number,
    },
    gratitude: [{
      type: String,
    }],
  },
  // Triggers & Coping
  triggers: [{
    type: String,
  }],
  copingStrategies: [{
    type: String,
  }],
  // Work-Life Balance
  workLifeBalance: {
    type: Number, // 1-5 scale
    min: 1,
    max: 5,
  },
  // Mental Health Score (calculated)
  mentalHealthScore: {
    overall: { type: Number, min: 0, max: 100 },
    moodScore: { type: Number, min: 0, max: 100 },
    stressScore: { type: Number, min: 0, max: 100 },
    wellnessScore: { type: Number, min: 0, max: 100 },
  },
  // Professional Support
  therapySession: {
    attended: { type: Boolean, default: false },
    notes: String,
  },
  // General Notes
  notes: String,
}, {
  timestamps: true,
});

// Index for efficient queries
mentalHealthRecordSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('MentalHealthRecord', mentalHealthRecordSchema);
