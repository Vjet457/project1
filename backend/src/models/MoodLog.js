const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema({
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
  time: {
    type: String, // HH:MM format
  },
  
  // Mood Rating
  moodRating: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  moodLabel: {
    type: String,
    enum: [
      'very_sad', 'sad', 'down', 'neutral', 'okay', 
      'good', 'happy', 'very_happy', 'excited', 'anxious',
      'stressed', 'angry', 'calm', 'peaceful', 'grateful'
    ],
  },
  
  // Emotions (multiple can be selected)
  emotions: [{
    type: String,
    enum: [
      'happy', 'sad', 'anxious', 'calm', 'stressed', 'excited',
      'angry', 'peaceful', 'confused', 'hopeful', 'grateful',
      'lonely', 'content', 'overwhelmed', 'motivated', 'tired',
      'energetic', 'frustrated', 'relaxed', 'worried', 'confident'
    ],
  }],
  
  // Lifestyle Factors affecting mood
  lifestyleFactors: {
    sleepQuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    sleepHours: Number,
    exercise: {
      type: String,
      enum: ['none', 'light', 'moderate', 'intense'],
    },
    socialInteraction: {
      type: String,
      enum: ['none', 'minimal', 'moderate', 'lots'],
    },
    workload: {
      type: String,
      enum: ['light', 'normal', 'heavy', 'overwhelming'],
    },
    nutrition: {
      type: String,
      enum: ['poor', 'okay', 'good', 'excellent'],
    },
    hydration: {
      type: Number, // glasses of water
    },
    caffeine: {
      type: Number, // cups
    },
    alcohol: {
      type: Boolean,
      default: false,
    },
    screenTime: {
      type: Number, // hours
    },
    outdoorTime: {
      type: Number, // minutes
    },
  },
  
  // Context
  context: {
    location: {
      type: String,
      enum: ['home', 'work', 'outdoors', 'travel', 'social', 'other'],
    },
    activity: {
      type: String,
      enum: ['working', 'relaxing', 'exercising', 'socializing', 'eating', 'commuting', 'other'],
    },
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'hot', 'cold'],
    },
  },
  
  // Triggers (what caused the mood)
  triggers: [{
    type: String,
  }],
  
  // Gratitude entries
  gratitude: [{
    type: String,
    maxlength: 200,
  }],
  
  // Journal entry
  journalEntry: {
    type: String,
    maxlength: 2000,
  },
  
  // AI Analysis
  aiAnalysis: {
    moodPattern: String,
    suggestions: [String],
    correlations: [{
      factor: String,
      impact: { type: String, enum: ['positive', 'negative', 'neutral'] },
    }],
  },
  
  // Privacy
  isPrivate: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
moodLogSchema.index({ user: 1, date: -1 });
moodLogSchema.index({ user: 1, moodRating: 1 });
moodLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('MoodLog', moodLogSchema);
