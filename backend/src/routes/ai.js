const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');

// Import models
const PhysicalHealth = require('../models/PhysicalHealth');
const MentalHealth = require('../models/MentalHealth');
const MoodLog = require('../models/MoodLog');
const SymptomCheck = require('../models/SymptomCheck');

/**
 * AI Health Scoring Engine
 * Provides health scores, risk assessments, and recommendations
 */

// Calculate Physical Health Score
function calculatePhysicalHealthScore(data) {
  let score = 0;
  let factors = [];

  // Steps (0-20 points)
  if (data.steps) {
    const stepsScore = Math.min((data.steps / 10000) * 20, 20);
    score += stepsScore;
    if (data.steps < 5000) {
      factors.push({ factor: 'Low step count', impact: 'negative', suggestion: 'Aim for at least 7,000-10,000 steps daily' });
    }
  }

  // Heart Rate (0-15 points)
  if (data.heartRate?.resting) {
    const hr = data.heartRate.resting;
    if (hr >= 60 && hr <= 80) score += 15;
    else if (hr >= 50 && hr <= 90) score += 10;
    else score += 5;
    if (hr > 100) {
      factors.push({ factor: 'Elevated resting heart rate', impact: 'warning', suggestion: 'Consider checking with a doctor' });
    }
  }

  // Blood Pressure (0-20 points)
  if (data.bloodPressure?.systolic && data.bloodPressure?.diastolic) {
    const sys = data.bloodPressure.systolic;
    const dia = data.bloodPressure.diastolic;
    if (sys < 120 && dia < 80) score += 20;
    else if (sys < 130 && dia < 85) score += 15;
    else if (sys < 140 && dia < 90) score += 10;
    else {
      score += 5;
      factors.push({ factor: 'High blood pressure', impact: 'negative', suggestion: 'Reduce sodium intake and exercise regularly' });
    }
  }

  // BMI (0-15 points)
  if (data.bmi?.value) {
    const bmi = data.bmi.value;
    if (bmi >= 18.5 && bmi < 25) score += 15;
    else if (bmi >= 25 && bmi < 30) score += 10;
    else score += 5;
    if (bmi >= 30) {
      factors.push({ factor: 'High BMI', impact: 'negative', suggestion: 'Focus on balanced diet and regular exercise' });
    }
  }

  // Sleep (0-15 points)
  if (data.sleep?.duration) {
    const sleep = data.sleep.duration;
    if (sleep >= 7 && sleep <= 9) score += 15;
    else if (sleep >= 6 && sleep < 7) score += 10;
    else score += 5;
    if (sleep < 6) {
      factors.push({ factor: 'Insufficient sleep', impact: 'negative', suggestion: 'Aim for 7-9 hours of quality sleep' });
    }
  }

  // Water Intake (0-10 points)
  if (data.waterIntake?.glasses) {
    const water = data.waterIntake.glasses;
    if (water >= 8) score += 10;
    else if (water >= 6) score += 7;
    else score += 3;
    if (water < 6) {
      factors.push({ factor: 'Low water intake', impact: 'warning', suggestion: 'Drink at least 8 glasses of water daily' });
    }
  }

  // Calories (0-5 points)
  if (data.calories?.intake && data.calories?.burned) {
    const balance = data.calories.intake - data.calories.burned;
    if (balance >= -500 && balance <= 500) score += 5;
    else score += 2;
  }

  return {
    overallScore: Math.round(score),
    maxScore: 100,
    grade: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement',
    factors,
    recommendations: generatePhysicalRecommendations(factors),
  };
}

// Calculate Mental Health Score
function calculateMentalHealthScore(data) {
  let score = 100;
  let factors = [];

  // Stress Score impact (each point reduces overall by 2)
  if (data.stressScore) {
    score -= data.stressScore * 2;
    if (data.stressScore > 6) {
      factors.push({ factor: 'High stress level', impact: 'negative', suggestion: 'Practice relaxation techniques like meditation or deep breathing' });
    }
  }

  // Anxiety Score impact
  if (data.anxietyScore) {
    score -= data.anxietyScore * 2;
    if (data.anxietyScore > 6) {
      factors.push({ factor: 'Elevated anxiety', impact: 'negative', suggestion: 'Consider mindfulness exercises or professional support' });
    }
  }

  // Depression Score impact
  if (data.depressionScore) {
    score -= data.depressionScore * 3;
    if (data.depressionScore > 6) {
      factors.push({ factor: 'Depression indicators', impact: 'negative', suggestion: 'Reach out to a mental health professional' });
    }
  }

  // Sleep Quality bonus
  if (data.sleepQuality) {
    score += (data.sleepQuality - 5) * 2;
    if (data.sleepQuality < 4) {
      factors.push({ factor: 'Poor sleep quality', impact: 'warning', suggestion: 'Establish a consistent sleep routine' });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    overallScore: score,
    maxScore: 100,
    grade: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Support',
    factors,
    recommendations: generateMentalRecommendations(factors),
    riskLevel: score < 40 ? 'high' : score < 60 ? 'moderate' : 'low',
  };
}

// Generate Physical Health Recommendations
function generatePhysicalRecommendations(factors) {
  const recommendations = [];
  
  const negativeFactors = factors.filter(f => f.impact === 'negative' || f.impact === 'warning');
  
  if (negativeFactors.length === 0) {
    recommendations.push('Great job! Maintain your current healthy lifestyle.');
    recommendations.push('Consider adding variety to your exercise routine.');
  } else {
    negativeFactors.forEach(f => {
      recommendations.push(f.suggestion);
    });
  }

  recommendations.push('Schedule regular health check-ups.');
  return recommendations.slice(0, 5);
}

// Generate Mental Health Recommendations
function generateMentalRecommendations(factors) {
  const recommendations = [];
  
  if (factors.some(f => f.factor.includes('stress'))) {
    recommendations.push('Try 10 minutes of daily meditation');
    recommendations.push('Practice the 4-7-8 breathing technique');
  }
  
  if (factors.some(f => f.factor.includes('anxiety'))) {
    recommendations.push('Limit caffeine and alcohol intake');
    recommendations.push('Exercise regularly to reduce anxiety');
  }
  
  if (factors.some(f => f.factor.includes('Depression'))) {
    recommendations.push('Consider speaking with a mental health professional');
    recommendations.push('Stay connected with friends and family');
    recommendations.push('Maintain a regular daily routine');
  }

  if (factors.some(f => f.factor.includes('sleep'))) {
    recommendations.push('Avoid screens 1 hour before bed');
    recommendations.push('Keep your bedroom cool and dark');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue your positive mental health practices');
    recommendations.push('Practice gratitude by noting 3 things you\'re thankful for daily');
  }

  return recommendations.slice(0, 5);
}

// Symptom Severity Analysis
function analyzeSymptomSeverity(symptoms) {
  if (!symptoms || symptoms.length === 0) {
    return { severity: 'none', score: 0, urgency: 'low' };
  }

  const avgSeverity = symptoms.reduce((sum, s) => sum + (s.severity || 5), 0) / symptoms.length;
  const maxSeverity = Math.max(...symptoms.map(s => s.severity || 5));
  const symptomCount = symptoms.length;

  let urgencyScore = avgSeverity * 0.4 + maxSeverity * 0.4 + Math.min(symptomCount, 5) * 2;
  
  // Critical symptom keywords
  const criticalKeywords = ['chest pain', 'difficulty breathing', 'severe headache', 'numbness', 'confusion', 'vision loss'];
  const hasCritical = symptoms.some(s => 
    criticalKeywords.some(kw => s.name?.toLowerCase().includes(kw))
  );
  
  if (hasCritical) urgencyScore += 30;

  return {
    severity: urgencyScore > 70 ? 'critical' : urgencyScore > 50 ? 'severe' : urgencyScore > 30 ? 'moderate' : 'mild',
    score: Math.round(urgencyScore),
    urgency: urgencyScore > 70 ? 'emergency' : urgencyScore > 50 ? 'high' : urgencyScore > 30 ? 'medium' : 'low',
    shouldSeeDoctor: urgencyScore > 40,
    recommendations: urgencyScore > 70 
      ? ['Seek immediate medical attention', 'Call emergency services if symptoms worsen']
      : urgencyScore > 50 
        ? ['Schedule a doctor appointment today', 'Monitor symptoms closely']
        : ['Rest and stay hydrated', 'Monitor symptoms for 24-48 hours'],
  };
}

// Routes

// @route   POST /api/ai/physical-health-score
// @desc    Calculate physical health score from latest data
// @access  Private
router.post('/physical-health-score', auth, async (req, res) => {
  try {
    const latestHealth = await PhysicalHealth.findOne({ user: req.user.id })
      .sort({ date: -1 });
    
    if (!latestHealth) {
      return res.status(404).json({ message: 'No physical health data found' });
    }

    const analysis = calculatePhysicalHealthScore(latestHealth);
    
    // Update the record with AI scores
    latestHealth.aiScores = {
      overallScore: analysis.overallScore,
      cardioScore: analysis.overallScore, // Simplified
      fitnessScore: analysis.overallScore,
      nutritionScore: analysis.overallScore,
    };
    latestHealth.aiRecommendations = analysis.recommendations;
    await latestHealth.save();

    res.json(analysis);
  } catch (error) {
    console.error('Physical health score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/ai/mental-health-score
// @desc    Calculate mental health score from latest data
// @access  Private
router.post('/mental-health-score', auth, async (req, res) => {
  try {
    const latestMental = await MentalHealth.findOne({ user: req.user.id })
      .sort({ date: -1 });
    
    if (!latestMental) {
      return res.status(404).json({ message: 'No mental health data found' });
    }

    const analysis = calculateMentalHealthScore(latestMental);
    
    // Update the record with AI analysis
    latestMental.aiRecommendations = analysis.recommendations;
    await latestMental.save();

    res.json(analysis);
  } catch (error) {
    console.error('Mental health score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/ai/analyze-symptoms
// @desc    Analyze symptoms and provide severity assessment
// @access  Private
router.post('/analyze-symptoms', auth, async (req, res) => {
  try {
    const { symptoms, additionalInfo } = req.body;
    
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({ message: 'No symptoms provided' });
    }

    const analysis = analyzeSymptomSeverity(symptoms);
    
    // Generate possible conditions (simplified)
    const possibleConditions = [];
    const symptomNames = symptoms.map(s => s.name?.toLowerCase() || '');
    
    if (symptomNames.some(n => n.includes('headache'))) {
      possibleConditions.push({
        name: 'Tension Headache',
        probability: 60,
        description: 'Common headache often caused by stress or poor posture',
        severity: 'mild',
      });
    }
    
    if (symptomNames.some(n => n.includes('fever') || n.includes('cough'))) {
      possibleConditions.push({
        name: 'Upper Respiratory Infection',
        probability: 55,
        description: 'Common cold or viral infection',
        severity: 'mild',
      });
    }
    
    if (symptomNames.some(n => n.includes('stomach') || n.includes('nausea'))) {
      possibleConditions.push({
        name: 'Gastritis',
        probability: 45,
        description: 'Inflammation of the stomach lining',
        severity: 'moderate',
      });
    }

    res.json({
      ...analysis,
      possibleConditions,
      disclaimer: 'This is an AI-assisted analysis and should not replace professional medical advice.',
    });
  } catch (error) {
    console.error('Symptom analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/ai/mood-analysis
// @desc    Analyze mood patterns over time
// @access  Private
router.post('/mood-analysis', auth, async (req, res) => {
  try {
    const { days = 7 } = req.body;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const moodLogs = await MoodLog.find({
      user: req.user.id,
      date: { $gte: startDate },
    }).sort({ date: 1 });
    
    if (moodLogs.length === 0) {
      return res.status(404).json({ message: 'No mood data found for this period' });
    }

    const avgMood = moodLogs.reduce((sum, log) => sum + log.moodRating, 0) / moodLogs.length;
    const moodTrend = moodLogs.length > 1 
      ? (moodLogs[moodLogs.length - 1].moodRating - moodLogs[0].moodRating) / moodLogs.length
      : 0;

    // Common emotions
    const emotionCounts = {};
    moodLogs.forEach(log => {
      log.emotions?.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });
    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));

    res.json({
      period: `${days} days`,
      totalEntries: moodLogs.length,
      averageMood: Math.round(avgMood * 10) / 10,
      moodTrend: moodTrend > 0.1 ? 'improving' : moodTrend < -0.1 ? 'declining' : 'stable',
      topEmotions,
      recommendations: avgMood < 5 
        ? ['Consider speaking with a counselor', 'Try journaling your thoughts', 'Practice self-care activities']
        : ['Keep up the positive mindset', 'Continue activities that bring you joy'],
    });
  } catch (error) {
    console.error('Mood analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/ai/health-summary
// @desc    Get comprehensive health summary
// @access  Private
router.get('/health-summary', auth, async (req, res) => {
  try {
    const [latestPhysical, latestMental, recentMoods] = await Promise.all([
      PhysicalHealth.findOne({ user: req.user.id }).sort({ date: -1 }),
      MentalHealth.findOne({ user: req.user.id }).sort({ date: -1 }),
      MoodLog.find({ user: req.user.id }).sort({ date: -1 }).limit(7),
    ]);

    const physicalScore = latestPhysical ? calculatePhysicalHealthScore(latestPhysical) : null;
    const mentalScore = latestMental ? calculateMentalHealthScore(latestMental) : null;
    const avgMood = recentMoods.length > 0 
      ? recentMoods.reduce((sum, m) => sum + m.moodRating, 0) / recentMoods.length 
      : null;

    const overallHealth = [];
    if (physicalScore) overallHealth.push(physicalScore.overallScore);
    if (mentalScore) overallHealth.push(mentalScore.overallScore);
    if (avgMood) overallHealth.push(avgMood * 10);

    const overallScore = overallHealth.length > 0 
      ? Math.round(overallHealth.reduce((a, b) => a + b, 0) / overallHealth.length)
      : null;

    res.json({
      overallScore,
      physical: physicalScore,
      mental: mentalScore,
      mood: avgMood ? {
        averageRating: Math.round(avgMood * 10) / 10,
        totalLogs: recentMoods.length,
      } : null,
      lastUpdated: {
        physical: latestPhysical?.date,
        mental: latestMental?.date,
        mood: recentMoods[0]?.date,
      },
    });
  } catch (error) {
    console.error('Health summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
