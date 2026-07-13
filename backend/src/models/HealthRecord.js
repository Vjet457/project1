const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Vital Signs
  vitals: {
    heartRate: {
      type: Number, // bpm
      min: 30,
      max: 250,
    },
    bloodPressure: {
      systolic: { type: Number, min: 60, max: 250 },
      diastolic: { type: Number, min: 40, max: 150 },
    },
    bloodOxygen: {
      type: Number, // SpO2 percentage
      min: 70,
      max: 100,
    },
    bodyTemperature: {
      type: Number, // Fahrenheit
      min: 90,
      max: 110,
    },
    respiratoryRate: {
      type: Number, // breaths per minute
      min: 5,
      max: 60,
    },
  },
  // Activity Metrics
  activity: {
    steps: {
      type: Number,
      default: 0,
    },
    distance: {
      type: Number, // in km
      default: 0,
    },
    caloriesBurned: {
      type: Number,
      default: 0,
    },
    activeMinutes: {
      type: Number,
      default: 0,
    },
    exerciseType: {
      type: String,
      enum: ['walking', 'running', 'cycling', 'swimming', 'gym', 'yoga', 'other', 'none'],
    },
    exerciseDuration: {
      type: Number, // minutes
    },
  },
  // Sleep Data
  sleep: {
    duration: {
      type: Number, // hours
      min: 0,
      max: 24,
    },
    quality: {
      type: Number, // 1-5 scale
      min: 1,
      max: 5,
    },
    bedTime: Date,
    wakeTime: Date,
    deepSleep: Number, // hours
    lightSleep: Number, // hours
    remSleep: Number, // hours
  },
  // Nutrition
  nutrition: {
    waterIntake: {
      type: Number, // glasses
      default: 0,
    },
    caloriesConsumed: Number,
    meals: [{
      type: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      description: String,
      calories: Number,
      time: Date,
    }],
  },
  // Body Measurements
  body: {
    weight: Number, // kg
    bmi: Number,
    bodyFatPercentage: Number,
    muscleMass: Number,
    waistCircumference: Number, // cm
  },
  // Health Score (calculated)
  healthScore: {
    overall: { type: Number, min: 0, max: 100 },
    vitalsScore: { type: Number, min: 0, max: 100 },
    activityScore: { type: Number, min: 0, max: 100 },
    sleepScore: { type: Number, min: 0, max: 100 },
    nutritionScore: { type: Number, min: 0, max: 100 },
  },
  // Notes
  notes: String,
  // Source of data
  source: {
    type: String,
    enum: ['manual', 'health_connect', 'apple_health', 'fitbit', 'garmin', 'other'],
    default: 'manual',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
healthRecordSchema.index({ user: 1, date: -1 });
healthRecordSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
