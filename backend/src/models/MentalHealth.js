const mongoose = require('mongoose');

const mentalHealthSchema = new mongoose.Schema({
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
  
  // Core Mental Health Scores (AI-assessed)
  stressScore: {
    value: { type: Number, min: 0, max: 100 },
    level: {
      type: String,
      enum: ['minimal', 'mild', 'moderate', 'high', 'severe'],
    },
  },
  anxietyScore: {
    value: { type: Number, min: 0, max: 100 },
    level: {
      type: String,
      enum: ['minimal', 'mild', 'moderate', 'high', 'severe'],
    },
  },
  depressionScore: {
    value: { type: Number, min: 0, max: 100 },
    level: {
      type: String,
      enum: ['minimal', 'mild', 'moderate', 'moderately_severe', 'severe'],
    },
  },
  
  // Sleep Quality Impact
  sleepQuality: {
    score: { type: Number, min: 1, max: 10 },
    hours: { type: Number, min: 0, max: 24 },
    issues: [{
      type: String,
      enum: ['insomnia', 'oversleeping', 'nightmares', 'restless', 'early_waking', 'difficulty_falling_asleep'],
    }],
  },
  
  // Assessment Questionnaire Responses
  assessmentResponses: {
    // PHQ-9 style questions for depression
    phq9: [{
      question: String,
      score: { type: Number, min: 0, max: 3 },
    }],
    // GAD-7 style questions for anxiety
    gad7: [{
      question: String,
      score: { type: Number, min: 0, max: 3 },
    }],
    // PSS-10 style questions for stress
    pss10: [{
      question: String,
      score: { type: Number, min: 0, max: 4 },
    }],
  },
  
  // Lifestyle Factors
  lifestyleFactors: {
    exerciseFrequency: {
      type: String,
      enum: ['none', 'rarely', 'weekly', 'several_times_week', 'daily'],
    },
    socialInteraction: {
      type: String,
      enum: ['isolated', 'minimal', 'moderate', 'active', 'very_active'],
    },
    workLifeBalance: { type: Number, min: 1, max: 10 },
    screenTime: { type: Number }, // hours
    outdoorTime: { type: Number }, // hours
  },
  
  // Wellness Activities
  wellnessActivities: {
    meditation: {
      practiced: { type: Boolean, default: false },
      duration: Number, // minutes
      type: String,
    },
    breathing: {
      practiced: { type: Boolean, default: false },
      duration: Number,
      technique: String,
    },
    journaling: {
      practiced: { type: Boolean, default: false },
      entry: String,
    },
    therapy: {
      attended: { type: Boolean, default: false },
      type: String,
      notes: String,
    },
  },
  
  // AI Recommendations
  aiRecommendations: {
    immediate: [{ type: String }],
    shortTerm: [{ type: String }],
    longTerm: [{ type: String }],
    professionalHelp: {
      recommended: { type: Boolean, default: false },
      urgency: {
        type: String,
        enum: ['routine', 'soon', 'urgent', 'immediate'],
      },
      specialistType: String,
    },
    copingStrategies: [{ type: String }],
    resources: [{
      title: String,
      type: { type: String, enum: ['article', 'video', 'exercise', 'hotline', 'app'] },
      url: String,
    }],
  },
  
  // Overall Mental Wellness Score
  overallScore: {
    value: { type: Number, min: 0, max: 100 },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
    },
    comparedToLastWeek: Number, // percentage change
  },
  
  // Triggers & Coping
  triggers: [{ type: String }],
  copingStrategiesUsed: [{ type: String }],
  
  notes: String,
}, {
  timestamps: true,
});

// Indexes
mentalHealthSchema.index({ user: 1, date: -1 });
mentalHealthSchema.index({ user: 1, 'overallScore.value': 1 });

// Calculate levels before save
mentalHealthSchema.pre('save', function(next) {
  // Stress level calculation
  if (this.stressScore?.value !== undefined) {
    const val = this.stressScore.value;
    if (val <= 20) this.stressScore.level = 'minimal';
    else if (val <= 40) this.stressScore.level = 'mild';
    else if (val <= 60) this.stressScore.level = 'moderate';
    else if (val <= 80) this.stressScore.level = 'high';
    else this.stressScore.level = 'severe';
  }
  
  // Anxiety level calculation
  if (this.anxietyScore?.value !== undefined) {
    const val = this.anxietyScore.value;
    if (val <= 20) this.anxietyScore.level = 'minimal';
    else if (val <= 40) this.anxietyScore.level = 'mild';
    else if (val <= 60) this.anxietyScore.level = 'moderate';
    else if (val <= 80) this.anxietyScore.level = 'high';
    else this.anxietyScore.level = 'severe';
  }
  
  // Depression level calculation
  if (this.depressionScore?.value !== undefined) {
    const val = this.depressionScore.value;
    if (val <= 20) this.depressionScore.level = 'minimal';
    else if (val <= 40) this.depressionScore.level = 'mild';
    else if (val <= 60) this.depressionScore.level = 'moderate';
    else if (val <= 80) this.depressionScore.level = 'moderately_severe';
    else this.depressionScore.level = 'severe';
  }
  
  next();
});

module.exports = mongoose.model('MentalHealth', mentalHealthSchema);
