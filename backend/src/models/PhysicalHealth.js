const mongoose = require('mongoose');

const physicalHealthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  // Activity Metrics
  steps: {
    type: Number,
    default: 0,
    min: 0,
  },
  distance: {
    type: Number, // km
    default: 0,
  },
  calories: {
    burned: { type: Number, default: 0 },
    consumed: { type: Number, default: 0 },
    goal: { type: Number, default: 2000 },
  },
  activeMinutes: {
    type: Number,
    default: 0,
  },
  exerciseType: {
    type: String,
    enum: ['walking', 'running', 'cycling', 'swimming', 'gym', 'yoga', 'sports', 'other', 'none'],
  },
  exerciseDuration: {
    type: Number, // minutes
  },
  
  // Vital Signs
  heartRate: {
    current: { type: Number, min: 30, max: 250 },
    resting: { type: Number, min: 30, max: 120 },
    max: { type: Number, min: 60, max: 250 },
    average: { type: Number, min: 30, max: 200 },
  },
  bloodPressure: {
    systolic: { type: Number, min: 60, max: 250 },
    diastolic: { type: Number, min: 40, max: 150 },
    status: {
      type: String,
      enum: ['low', 'normal', 'elevated', 'high_stage1', 'high_stage2', 'crisis'],
    },
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
  
  // Body Measurements
  weight: {
    type: Number, // kg
    min: 20,
    max: 300,
  },
  bmi: {
    value: { type: Number },
    category: {
      type: String,
      enum: ['underweight', 'normal', 'overweight', 'obese_class1', 'obese_class2', 'obese_class3'],
    },
  },
  bodyFatPercentage: {
    type: Number,
    min: 2,
    max: 60,
  },
  muscleMass: {
    type: Number, // kg
  },
  waistCircumference: {
    type: Number, // cm
  },
  
  // Sleep Data
  sleep: {
    duration: { type: Number, min: 0, max: 24 }, // hours
    quality: { type: Number, min: 1, max: 5 },
    bedTime: Date,
    wakeTime: Date,
    deepSleep: Number, // hours
    lightSleep: Number, // hours
    remSleep: Number, // hours
    awakenings: Number,
  },
  
  // Hydration & Nutrition
  waterIntake: {
    glasses: { type: Number, default: 0 },
    liters: { type: Number, default: 0 },
    goal: { type: Number, default: 8 }, // glasses
  },
  meals: [{
    type: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    description: String,
    calories: Number,
    time: Date,
  }],
  
  // AI-Generated Scores
  aiScores: {
    overallHealthScore: { type: Number, min: 0, max: 100 },
    vitalsScore: { type: Number, min: 0, max: 100 },
    activityScore: { type: Number, min: 0, max: 100 },
    sleepScore: { type: Number, min: 0, max: 100 },
    nutritionScore: { type: Number, min: 0, max: 100 },
    hydrationScore: { type: Number, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
    },
    recommendations: [{ type: String }],
    insights: [{ type: String }],
  },
  
  // Data Source
  source: {
    type: String,
    enum: ['manual', 'health_connect', 'apple_health', 'fitbit', 'garmin', 'samsung_health', 'other'],
    default: 'manual',
  },
  
  notes: String,
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
physicalHealthSchema.index({ user: 1, date: -1 });
physicalHealthSchema.index({ user: 1, createdAt: -1 });

// Calculate BP status before save
physicalHealthSchema.pre('save', function(next) {
  if (this.bloodPressure?.systolic && this.bloodPressure?.diastolic) {
    const sys = this.bloodPressure.systolic;
    const dia = this.bloodPressure.diastolic;
    
    if (sys < 90 || dia < 60) {
      this.bloodPressure.status = 'low';
    } else if (sys < 120 && dia < 80) {
      this.bloodPressure.status = 'normal';
    } else if (sys < 130 && dia < 80) {
      this.bloodPressure.status = 'elevated';
    } else if (sys < 140 || dia < 90) {
      this.bloodPressure.status = 'high_stage1';
    } else if (sys < 180 || dia < 120) {
      this.bloodPressure.status = 'high_stage2';
    } else {
      this.bloodPressure.status = 'crisis';
    }
  }
  next();
});

module.exports = mongoose.model('PhysicalHealth', physicalHealthSchema);
