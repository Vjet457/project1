/**
 * AI Health Service
 * Provides AI-powered health analysis including:
 * - Symptom severity assessment
 * - Physical health score prediction
 * - Mental health score prediction
 */

// ==================== TYPES ====================

export interface Symptom {
  id: string;
  name: string;
  duration: 'hours' | 'days' | 'weeks' | 'months';
  durationValue: number;
  intensity: 1 | 2 | 3 | 4 | 5; // 1=mild, 5=severe
  frequency: 'constant' | 'frequent' | 'occasional' | 'rare';
  category: 'pain' | 'respiratory' | 'digestive' | 'neurological' | 'cardiovascular' | 'general' | 'skin' | 'mental';
}

export interface SymptomSeverityResult {
  overallSeverity: 'mild' | 'moderate' | 'severe' | 'critical';
  severityScore: number; // 0-100
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  recommendation: string;
  shouldSeekMedicalAttention: boolean;
  estimatedConditions: PredictedCondition[];
  redFlags: string[];
}

export interface PredictedCondition {
  name: string;
  probability: number; // 0-100
  severity: 'low' | 'medium' | 'high';
  description: string;
  specialistType: string;
}

export interface PhysicalHealthInput {
  // Vitals
  heartRate?: number; // bpm
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodOxygen?: number; // SpO2 %
  bodyTemperature?: number; // Fahrenheit
  respiratoryRate?: number; // breaths per minute
  
  // Activity
  dailySteps?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  
  // Body metrics
  bmi?: number;
  weight?: number; // kg
  height?: number; // cm
  bodyFatPercentage?: number;
  
  // Sleep
  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  
  // Nutrition
  waterIntake?: number; // liters
  
  // Lifestyle
  smokingStatus?: 'never' | 'former' | 'current';
  alcoholConsumption?: 'none' | 'occasional' | 'moderate' | 'heavy';
  
  // Age and gender for baseline adjustments
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

export interface PhysicalHealthScore {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  breakdown: {
    cardiovascular: number;
    respiratory: number;
    activity: number;
    sleep: number;
    bodyComposition: number;
    nutrition: number;
  };
  insights: string[];
  recommendations: string[];
  riskFactors: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface MentalHealthInput {
  // Mood tracking
  currentMood: 1 | 2 | 3 | 4 | 5; // 1=very low, 5=excellent
  moodHistory?: number[]; // Last 7 days mood scores
  
  // Stress & Anxiety
  stressLevel: 1 | 2 | 3 | 4 | 5;
  anxietyLevel: 1 | 2 | 3 | 4 | 5;
  
  // Sleep impact
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  sleepHours?: number;
  
  // Social
  socialInteraction?: 'isolated' | 'minimal' | 'moderate' | 'active';
  
  // Energy & Motivation
  energyLevel: 1 | 2 | 3 | 4 | 5;
  motivationLevel: 1 | 2 | 3 | 4 | 5;
  
  // Symptoms
  hasAppetiteChanges?: boolean;
  hasConcentrationIssues?: boolean;
  hasNegativeThoughts?: boolean;
  hasSelfHarmThoughts?: boolean;
  
  // Activities
  exerciseFrequency?: 'none' | 'rarely' | 'weekly' | 'daily';
  meditationPractice?: boolean;
  
  // Life events
  recentMajorLifeEvent?: boolean;
  workLifeBalance?: 1 | 2 | 3 | 4 | 5;
}

export interface MentalHealthScore {
  overallScore: number; // 0-100
  status: 'thriving' | 'healthy' | 'coping' | 'struggling' | 'crisis';
  breakdown: {
    emotionalWellbeing: number;
    stressResilience: number;
    sleepMentalHealth: number;
    socialConnection: number;
    cognitiveFunction: number;
    selfCare: number;
  };
  moodTrend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  insights: string[];
  recommendations: string[];
  copingStrategies: string[];
  professionalHelpRecommended: boolean;
  crisisResources?: string[];
}

// ==================== SYMPTOM DATABASE ====================

const symptomWeights: Record<string, number> = {
  // Critical symptoms
  'chest_pain': 0.9,
  'difficulty_breathing': 0.9,
  'severe_headache': 0.8,
  'loss_of_consciousness': 1.0,
  'paralysis': 1.0,
  'severe_bleeding': 0.95,
  'seizure': 0.9,
  
  // High severity
  'high_fever': 0.7,
  'persistent_vomiting': 0.65,
  'severe_abdominal_pain': 0.7,
  'confusion': 0.75,
  'vision_changes': 0.7,
  'slurred_speech': 0.85,
  
  // Moderate severity
  'moderate_pain': 0.5,
  'nausea': 0.4,
  'dizziness': 0.5,
  'fatigue': 0.35,
  'mild_fever': 0.4,
  'cough': 0.35,
  'headache': 0.4,
  
  // Low severity
  'runny_nose': 0.2,
  'mild_headache': 0.25,
  'minor_aches': 0.2,
  'sore_throat': 0.3,
  'sneezing': 0.15,
};

const redFlagSymptoms = [
  'chest_pain',
  'difficulty_breathing',
  'loss_of_consciousness',
  'paralysis',
  'severe_bleeding',
  'seizure',
  'slurred_speech',
  'sudden_severe_headache',
  'self_harm_thoughts',
];

const conditionDatabase: Record<string, { symptoms: string[]; severity: 'low' | 'medium' | 'high'; specialist: string }> = {
  'Common Cold': {
    symptoms: ['runny_nose', 'sneezing', 'sore_throat', 'mild_fever', 'cough'],
    severity: 'low',
    specialist: 'General Physician'
  },
  'Influenza': {
    symptoms: ['high_fever', 'body_aches', 'fatigue', 'cough', 'headache'],
    severity: 'medium',
    specialist: 'General Physician'
  },
  'Migraine': {
    symptoms: ['severe_headache', 'nausea', 'vision_changes', 'light_sensitivity'],
    severity: 'medium',
    specialist: 'Neurologist'
  },
  'Hypertension': {
    symptoms: ['headache', 'dizziness', 'chest_pain', 'shortness_of_breath'],
    severity: 'high',
    specialist: 'Cardiologist'
  },
  'Anxiety Disorder': {
    symptoms: ['rapid_heartbeat', 'sweating', 'trembling', 'difficulty_breathing', 'restlessness'],
    severity: 'medium',
    specialist: 'Psychiatrist'
  },
  'Gastroenteritis': {
    symptoms: ['nausea', 'vomiting', 'diarrhea', 'abdominal_pain', 'mild_fever'],
    severity: 'medium',
    specialist: 'Gastroenterologist'
  },
  'Respiratory Infection': {
    symptoms: ['cough', 'fever', 'difficulty_breathing', 'chest_pain', 'fatigue'],
    severity: 'medium',
    specialist: 'Pulmonologist'
  },
};

// ==================== AI ANALYSIS FUNCTIONS ====================

/**
 * Analyzes symptoms and returns severity assessment
 */
export const analyzeSymptomSeverity = (symptoms: Symptom[]): SymptomSeverityResult => {
  if (symptoms.length === 0) {
    return {
      overallSeverity: 'mild',
      severityScore: 0,
      urgencyLevel: 'low',
      recommendation: 'No symptoms reported. Continue monitoring your health.',
      shouldSeekMedicalAttention: false,
      estimatedConditions: [],
      redFlags: [],
    };
  }

  // Calculate weighted severity score
  let totalWeight = 0;
  let weightedSum = 0;
  const detectedRedFlags: string[] = [];

  symptoms.forEach(symptom => {
    const baseWeight = symptomWeights[symptom.name.toLowerCase().replace(/\s+/g, '_')] || 0.3;
    
    // Adjust for intensity
    const intensityMultiplier = symptom.intensity * 0.2;
    
    // Adjust for duration
    let durationMultiplier = 1;
    if (symptom.duration === 'weeks') durationMultiplier = 1.3;
    if (symptom.duration === 'months') durationMultiplier = 1.5;
    
    // Adjust for frequency
    const frequencyMultiplier = 
      symptom.frequency === 'constant' ? 1.4 :
      symptom.frequency === 'frequent' ? 1.2 :
      symptom.frequency === 'occasional' ? 1.0 : 0.8;

    const symptomScore = baseWeight * intensityMultiplier * durationMultiplier * frequencyMultiplier;
    weightedSum += symptomScore;
    totalWeight += 1;

    // Check for red flags
    const normalizedName = symptom.name.toLowerCase().replace(/\s+/g, '_');
    if (redFlagSymptoms.includes(normalizedName)) {
      detectedRedFlags.push(symptom.name);
    }
  });

  // Normalize to 0-100 scale
  const rawScore = (weightedSum / totalWeight) * 100;
  const severityScore = Math.min(100, Math.max(0, rawScore));

  // Determine severity level
  let overallSeverity: 'mild' | 'moderate' | 'severe' | 'critical';
  let urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  
  if (detectedRedFlags.length > 0 || severityScore >= 80) {
    overallSeverity = 'critical';
    urgencyLevel = 'emergency';
  } else if (severityScore >= 60) {
    overallSeverity = 'severe';
    urgencyLevel = 'high';
  } else if (severityScore >= 40) {
    overallSeverity = 'moderate';
    urgencyLevel = 'medium';
  } else {
    overallSeverity = 'mild';
    urgencyLevel = 'low';
  }

  // Predict conditions
  const estimatedConditions = predictConditions(symptoms);

  // Generate recommendation
  const recommendation = generateRecommendation(overallSeverity, detectedRedFlags, estimatedConditions);

  return {
    overallSeverity,
    severityScore: Math.round(severityScore),
    urgencyLevel,
    recommendation,
    shouldSeekMedicalAttention: urgencyLevel === 'high' || urgencyLevel === 'emergency',
    estimatedConditions,
    redFlags: detectedRedFlags,
  };
};

/**
 * Predicts possible conditions based on symptoms
 */
const predictConditions = (symptoms: Symptom[]): PredictedCondition[] => {
  const symptomNames = symptoms.map(s => s.name.toLowerCase().replace(/\s+/g, '_'));
  const predictions: PredictedCondition[] = [];

  Object.entries(conditionDatabase).forEach(([condition, data]) => {
    const matchingSymptoms = data.symptoms.filter(s => 
      symptomNames.some(sn => sn.includes(s) || s.includes(sn))
    );
    
    if (matchingSymptoms.length > 0) {
      const probability = Math.min(95, (matchingSymptoms.length / data.symptoms.length) * 100);
      
      predictions.push({
        name: condition,
        probability: Math.round(probability),
        severity: data.severity,
        description: `${matchingSymptoms.length} of ${data.symptoms.length} symptoms match`,
        specialistType: data.specialist,
      });
    }
  });

  return predictions.sort((a, b) => b.probability - a.probability).slice(0, 5);
};

/**
 * Generates recommendation based on analysis
 */
const generateRecommendation = (
  severity: string, 
  redFlags: string[], 
  conditions: PredictedCondition[]
): string => {
  if (redFlags.length > 0) {
    return `⚠️ URGENT: You have reported critical symptoms (${redFlags.join(', ')}). Please seek immediate medical attention or call emergency services.`;
  }

  switch (severity) {
    case 'critical':
      return 'Your symptoms indicate a potentially serious condition. Please visit an emergency room or call emergency services immediately.';
    case 'severe':
      return 'Your symptoms suggest you should consult a doctor within the next 24 hours. Consider visiting an urgent care clinic.';
    case 'moderate':
      return 'Schedule an appointment with your healthcare provider within the next few days. Monitor your symptoms closely.';
    default:
      const topCondition = conditions[0];
      if (topCondition) {
        return `Your symptoms are mild. Rest, stay hydrated, and monitor for changes. If symptoms persist beyond a week, consider consulting a ${topCondition.specialistType}.`;
      }
      return 'Your symptoms are mild. Rest, stay hydrated, and monitor for any changes. Seek medical advice if symptoms worsen.';
  }
};

/**
 * Calculates physical health score based on various metrics
 */
export const calculatePhysicalHealthScore = (input: PhysicalHealthInput): PhysicalHealthScore => {
  const scores = {
    cardiovascular: calculateCardiovascularScore(input),
    respiratory: calculateRespiratoryScore(input),
    activity: calculateActivityScore(input),
    sleep: calculateSleepScore(input),
    bodyComposition: calculateBodyCompositionScore(input),
    nutrition: calculateNutritionScore(input),
  };

  // Weight each category
  const weights = {
    cardiovascular: 0.25,
    respiratory: 0.15,
    activity: 0.20,
    sleep: 0.15,
    bodyComposition: 0.15,
    nutrition: 0.10,
  };

  const overallScore = Math.round(
    scores.cardiovascular * weights.cardiovascular +
    scores.respiratory * weights.respiratory +
    scores.activity * weights.activity +
    scores.sleep * weights.sleep +
    scores.bodyComposition * weights.bodyComposition +
    scores.nutrition * weights.nutrition
  );

  // Determine grade and status
  const { grade, status } = getHealthGradeAndStatus(overallScore);

  // Generate insights and recommendations
  const { insights, recommendations, riskFactors } = generatePhysicalHealthInsights(input, scores);

  return {
    overallScore,
    grade,
    status,
    breakdown: scores,
    insights,
    recommendations,
    riskFactors,
    trend: 'stable', // Would need historical data to determine actual trend
  };
};

const calculateCardiovascularScore = (input: PhysicalHealthInput): number => {
  let score = 100;

  if (input.heartRate) {
    if (input.heartRate < 50 || input.heartRate > 100) score -= 20;
    else if (input.heartRate < 60 || input.heartRate > 80) score -= 5;
  }

  if (input.bloodPressureSystolic && input.bloodPressureDiastolic) {
    const sys = input.bloodPressureSystolic;
    const dia = input.bloodPressureDiastolic;
    
    if (sys >= 180 || dia >= 120) score -= 40; // Hypertensive crisis
    else if (sys >= 140 || dia >= 90) score -= 25; // High
    else if (sys >= 130 || dia >= 80) score -= 10; // Elevated
    else if (sys < 90 || dia < 60) score -= 15; // Low
  }

  return Math.max(0, score);
};

const calculateRespiratoryScore = (input: PhysicalHealthInput): number => {
  let score = 100;

  if (input.bloodOxygen) {
    if (input.bloodOxygen < 90) score -= 50;
    else if (input.bloodOxygen < 95) score -= 25;
    else if (input.bloodOxygen < 97) score -= 10;
  }

  if (input.respiratoryRate) {
    if (input.respiratoryRate < 12 || input.respiratoryRate > 20) score -= 15;
  }

  if (input.smokingStatus === 'current') score -= 30;
  else if (input.smokingStatus === 'former') score -= 10;

  return Math.max(0, score);
};

const calculateActivityScore = (input: PhysicalHealthInput): number => {
  let score = 50; // Start at middle

  if (input.dailySteps) {
    if (input.dailySteps >= 10000) score = 100;
    else if (input.dailySteps >= 7500) score = 85;
    else if (input.dailySteps >= 5000) score = 70;
    else if (input.dailySteps >= 2500) score = 50;
    else score = 30;
  }

  if (input.activeMinutes) {
    if (input.activeMinutes >= 60) score = Math.min(100, score + 10);
    else if (input.activeMinutes >= 30) score = Math.min(100, score + 5);
  }

  return score;
};

const calculateSleepScore = (input: PhysicalHealthInput): number => {
  let score = 100;

  if (input.sleepHours) {
    if (input.sleepHours < 5 || input.sleepHours > 10) score -= 30;
    else if (input.sleepHours < 6 || input.sleepHours > 9) score -= 15;
    else if (input.sleepHours < 7 || input.sleepHours > 8) score -= 5;
  }

  if (input.sleepQuality) {
    score -= (5 - input.sleepQuality) * 10;
  }

  return Math.max(0, score);
};

const calculateBodyCompositionScore = (input: PhysicalHealthInput): number => {
  let score = 100;

  if (input.bmi) {
    if (input.bmi < 16 || input.bmi >= 40) score -= 40;
    else if (input.bmi < 18.5 || input.bmi >= 35) score -= 30;
    else if (input.bmi >= 30) score -= 20;
    else if (input.bmi >= 25) score -= 10;
  }

  if (input.bodyFatPercentage) {
    const ideal = input.gender === 'female' ? { low: 21, high: 33 } : { low: 8, high: 20 };
    if (input.bodyFatPercentage < ideal.low - 5 || input.bodyFatPercentage > ideal.high + 10) {
      score -= 25;
    } else if (input.bodyFatPercentage < ideal.low || input.bodyFatPercentage > ideal.high) {
      score -= 10;
    }
  }

  return Math.max(0, score);
};

const calculateNutritionScore = (input: PhysicalHealthInput): number => {
  let score = 70; // Default moderate score

  if (input.waterIntake) {
    if (input.waterIntake >= 2.5) score = 100;
    else if (input.waterIntake >= 2) score = 85;
    else if (input.waterIntake >= 1.5) score = 70;
    else score = 50;
  }

  if (input.alcoholConsumption === 'heavy') score -= 25;
  else if (input.alcoholConsumption === 'moderate') score -= 10;

  return Math.max(0, score);
};

const getHealthGradeAndStatus = (score: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; status: PhysicalHealthScore['status'] } => {
  if (score >= 90) return { grade: 'A', status: 'excellent' };
  if (score >= 80) return { grade: 'B', status: 'good' };
  if (score >= 65) return { grade: 'C', status: 'fair' };
  if (score >= 50) return { grade: 'D', status: 'poor' };
  return { grade: 'F', status: 'critical' };
};

const generatePhysicalHealthInsights = (
  input: PhysicalHealthInput, 
  scores: PhysicalHealthScore['breakdown']
): { insights: string[]; recommendations: string[]; riskFactors: string[] } => {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const riskFactors: string[] = [];

  // Cardiovascular insights
  if (scores.cardiovascular < 70) {
    if (input.heartRate && input.heartRate > 100) {
      insights.push('Your resting heart rate is elevated');
      recommendations.push('Practice relaxation techniques and consider aerobic exercise');
    }
    if (input.bloodPressureSystolic && input.bloodPressureSystolic >= 130) {
      riskFactors.push('Elevated blood pressure');
      recommendations.push('Reduce sodium intake and monitor blood pressure regularly');
    }
  }

  // Activity insights
  if (scores.activity < 60) {
    insights.push('Your daily activity level is below recommended');
    recommendations.push('Aim for at least 7,500 steps daily and 30 minutes of moderate exercise');
    riskFactors.push('Sedentary lifestyle');
  } else if (scores.activity >= 85) {
    insights.push('Great job maintaining an active lifestyle!');
  }

  // Sleep insights
  if (scores.sleep < 70) {
    insights.push('Your sleep pattern needs improvement');
    recommendations.push('Establish a consistent sleep schedule and aim for 7-8 hours');
    riskFactors.push('Poor sleep quality');
  }

  // Body composition insights
  if (scores.bodyComposition < 70) {
    if (input.bmi && input.bmi >= 25) {
      riskFactors.push('Elevated BMI');
      recommendations.push('Focus on balanced nutrition and regular physical activity');
    }
  }

  // Smoking
  if (input.smokingStatus === 'current') {
    riskFactors.push('Active smoking');
    recommendations.push('Consider smoking cessation programs - this is the most impactful change you can make');
  }

  // Add positive insights if doing well
  if (scores.cardiovascular >= 85 && scores.activity >= 85) {
    insights.push('Your cardiovascular health metrics are excellent');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue maintaining your healthy lifestyle habits');
  }

  return { insights, recommendations, riskFactors };
};

/**
 * Calculates mental health score based on various inputs
 */
export const calculateMentalHealthScore = (input: MentalHealthInput): MentalHealthScore => {
  // Check for crisis indicators first
  if (input.hasSelfHarmThoughts) {
    return createCrisisResponse(input);
  }

  const breakdown = {
    emotionalWellbeing: calculateEmotionalWellbeingScore(input),
    stressResilience: calculateStressResilienceScore(input),
    sleepMentalHealth: calculateSleepMentalHealthScore(input),
    socialConnection: calculateSocialConnectionScore(input),
    cognitiveFunction: calculateCognitiveFunctionScore(input),
    selfCare: calculateSelfCareScore(input),
  };

  // Weight each category
  const weights = {
    emotionalWellbeing: 0.25,
    stressResilience: 0.20,
    sleepMentalHealth: 0.15,
    socialConnection: 0.15,
    cognitiveFunction: 0.10,
    selfCare: 0.15,
  };

  const overallScore = Math.round(
    breakdown.emotionalWellbeing * weights.emotionalWellbeing +
    breakdown.stressResilience * weights.stressResilience +
    breakdown.sleepMentalHealth * weights.sleepMentalHealth +
    breakdown.socialConnection * weights.socialConnection +
    breakdown.cognitiveFunction * weights.cognitiveFunction +
    breakdown.selfCare * weights.selfCare
  );

  // Determine status
  const status = getMentalHealthStatus(overallScore);
  const riskLevel = getMentalHealthRiskLevel(input, overallScore);
  const moodTrend = calculateMoodTrend(input.moodHistory);

  // Generate insights and recommendations
  const { insights, recommendations, copingStrategies } = generateMentalHealthInsights(input, breakdown);

  return {
    overallScore,
    status,
    breakdown,
    moodTrend,
    riskLevel,
    insights,
    recommendations,
    copingStrategies,
    professionalHelpRecommended: riskLevel === 'high' || riskLevel === 'severe' || overallScore < 40,
  };
};

const createCrisisResponse = (input: MentalHealthInput): MentalHealthScore => {
  return {
    overallScore: 0,
    status: 'crisis',
    breakdown: {
      emotionalWellbeing: 0,
      stressResilience: 0,
      sleepMentalHealth: 0,
      socialConnection: 0,
      cognitiveFunction: 0,
      selfCare: 0,
    },
    moodTrend: 'declining',
    riskLevel: 'severe',
    insights: ['We noticed you may be having thoughts of self-harm. You are not alone.'],
    recommendations: [
      'Please reach out to a mental health professional immediately',
      'Contact a crisis helpline if you need immediate support',
    ],
    copingStrategies: [
      'Call a trusted friend or family member right now',
      'Go to a safe, calm environment',
      'Focus on your breathing - 4 counts in, 4 counts out',
    ],
    professionalHelpRecommended: true,
    crisisResources: [
      '🆘 iCall: 9152987821',
      '🆘 Vandrevala Foundation: 1860-2662-345',
      '🆘 NIMHANS: 080-46110007',
      '🆘 Mental Health Helpline: 1800-599-0019',
    ],
  };
};

const calculateEmotionalWellbeingScore = (input: MentalHealthInput): number => {
  let score = input.currentMood * 20; // Base score from current mood (0-100)

  if (input.hasNegativeThoughts) score -= 20;
  if (input.hasAppetiteChanges) score -= 10;

  return Math.max(0, Math.min(100, score));
};

const calculateStressResilienceScore = (input: MentalHealthInput): number => {
  // Lower stress = higher resilience score
  const stressScore = (5 - input.stressLevel + 1) * 20;
  const anxietyScore = (5 - input.anxietyLevel + 1) * 20;
  
  let score = (stressScore + anxietyScore) / 2;

  if (input.recentMajorLifeEvent) score -= 15;
  if (input.workLifeBalance && input.workLifeBalance < 3) score -= 10;

  return Math.max(0, Math.min(100, score));
};

const calculateSleepMentalHealthScore = (input: MentalHealthInput): number => {
  let score = 70;

  if (input.sleepQuality) {
    score = input.sleepQuality * 20;
  }

  if (input.sleepHours) {
    if (input.sleepHours >= 7 && input.sleepHours <= 9) score = Math.min(100, score + 10);
    else if (input.sleepHours < 5 || input.sleepHours > 10) score -= 20;
  }

  return Math.max(0, score);
};

const calculateSocialConnectionScore = (input: MentalHealthInput): number => {
  const socialScores: Record<string, number> = {
    'active': 100,
    'moderate': 75,
    'minimal': 45,
    'isolated': 20,
  };

  return socialScores[input.socialInteraction || 'moderate'] || 60;
};

const calculateCognitiveFunctionScore = (input: MentalHealthInput): number => {
  let score = 80;

  if (input.hasConcentrationIssues) score -= 25;
  
  // Low energy and motivation affect cognitive function
  const avgEnergyMotivation = (input.energyLevel + input.motivationLevel) / 2;
  score = score * (avgEnergyMotivation / 5);

  return Math.max(0, Math.min(100, score));
};

const calculateSelfCareScore = (input: MentalHealthInput): number => {
  let score = 50;

  const exerciseScores: Record<string, number> = {
    'daily': 40,
    'weekly': 25,
    'rarely': 10,
    'none': 0,
  };

  score += exerciseScores[input.exerciseFrequency || 'rarely'] || 10;

  if (input.meditationPractice) score += 20;
  if (input.sleepQuality && input.sleepQuality >= 4) score += 10;

  return Math.min(100, score);
};

const getMentalHealthStatus = (score: number): MentalHealthScore['status'] => {
  if (score >= 85) return 'thriving';
  if (score >= 70) return 'healthy';
  if (score >= 50) return 'coping';
  if (score >= 30) return 'struggling';
  return 'crisis';
};

const getMentalHealthRiskLevel = (input: MentalHealthInput, score: number): MentalHealthScore['riskLevel'] => {
  if (input.hasSelfHarmThoughts) return 'severe';
  if (score < 30 || (input.stressLevel >= 4 && input.anxietyLevel >= 4)) return 'high';
  if (score < 50 || input.socialInteraction === 'isolated') return 'moderate';
  return 'low';
};

const calculateMoodTrend = (moodHistory?: number[]): 'improving' | 'stable' | 'declining' => {
  if (!moodHistory || moodHistory.length < 3) return 'stable';

  const recent = moodHistory.slice(-3);
  const older = moodHistory.slice(0, -3);

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'declining';
  return 'stable';
};

const generateMentalHealthInsights = (
  input: MentalHealthInput,
  breakdown: MentalHealthScore['breakdown']
): { insights: string[]; recommendations: string[]; copingStrategies: string[] } => {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const copingStrategies: string[] = [];

  // Emotional wellbeing
  if (breakdown.emotionalWellbeing >= 80) {
    insights.push('Your emotional wellbeing is in a great state');
  } else if (breakdown.emotionalWellbeing < 50) {
    insights.push('Your emotional health needs some attention');
    recommendations.push('Consider keeping a mood journal to track patterns');
    copingStrategies.push('Practice gratitude - write down 3 things you\'re thankful for daily');
  }

  // Stress and anxiety
  if (breakdown.stressResilience < 50) {
    insights.push('Your stress levels are elevated');
    recommendations.push('Incorporate stress-reduction techniques into your daily routine');
    copingStrategies.push('Try the 4-7-8 breathing technique: Inhale 4s, hold 7s, exhale 8s');
    copingStrategies.push('Take short breaks every hour during work');
  }

  // Social connection
  if (breakdown.socialConnection < 50) {
    insights.push('Social isolation may be affecting your mental health');
    recommendations.push('Reach out to a friend or family member this week');
    copingStrategies.push('Join a community group or class that interests you');
  }

  // Sleep
  if (breakdown.sleepMentalHealth < 60) {
    insights.push('Poor sleep is impacting your mental wellness');
    recommendations.push('Establish a calming bedtime routine');
    copingStrategies.push('Avoid screens 1 hour before bed');
  }

  // Self-care
  if (breakdown.selfCare < 50) {
    recommendations.push('Prioritize self-care activities, even 10 minutes daily');
    copingStrategies.push('Start with 5 minutes of mindfulness meditation daily');
  }

  // Exercise benefits
  if (input.exerciseFrequency === 'none' || input.exerciseFrequency === 'rarely') {
    recommendations.push('Regular exercise can significantly improve mood - start with short walks');
    copingStrategies.push('A 10-minute walk can boost your mood immediately');
  }

  // Positive reinforcement
  if (input.meditationPractice) {
    insights.push('Great job maintaining a meditation practice!');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue your current mental wellness practices');
  }

  if (copingStrategies.length === 0) {
    copingStrategies.push('Deep breathing when feeling overwhelmed');
    copingStrategies.push('Take a mindful walk in nature');
  }

  return { insights, recommendations, copingStrategies };
};

// ==================== EXPORT DEFAULT ====================

export default {
  analyzeSymptomSeverity,
  calculatePhysicalHealthScore,
  calculateMentalHealthScore,
};
