/**
 * Mental Health ML Model
 * 
 * Provides ML-based mental health score prediction using
 * Random Forest with risk assessment and coping strategies.
 */

import {
  RandomForestClassifier,
  RandomForestModel,
  hybridScore,
  probaToScore,
} from './RandomForestInference';

export interface MentalHealthInput {
  currentMood: number; // 1-5
  stressLevel: number; // 1-5
  anxietyLevel: number; // 1-5
  energyLevel: number; // 1-5
  motivationLevel: number; // 1-5
  sleepQuality: number; // 1-5
  sleepHours: number;
  socialInteraction: number; // 0-3 (0=isolated, 3=active)
  exerciseFrequency: number; // 0-4 (times per week)
  meditationPractice: boolean;
  workLifeBalance: number; // 1-5
  appetiteChanges: boolean;
  concentrationIssues: boolean;
  negativeThoughts: boolean;
  recentLifeEvent: boolean;
}

export interface MentalHealthResult {
  score: number;
  category: 'Thriving' | 'Healthy' | 'Coping' | 'Struggling' | 'Crisis';
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  mlScore: number;
  baselineScore: number;
  confidence: number;
  copingStrategies: string[];
  wellbeingFactors: {
    positive: string[];
    needsAttention: string[];
  };
}

/**
 * Calculate derived features for model input
 */
function calculateDerivedFeatures(input: MentalHealthInput): {
  moodEnergyRatio: number;
  stressAnxietyCombined: number;
  wellbeingIndex: number;
  riskFactorCount: number;
} {
  const moodEnergyRatio = input.currentMood / (6 - input.energyLevel + 0.1);
  const stressAnxietyCombined = (input.stressLevel + input.anxietyLevel) / 2;
  
  const wellbeingIndex = (
    input.currentMood +
    input.energyLevel +
    input.motivationLevel +
    input.sleepQuality +
    input.workLifeBalance
  ) / 5 - (input.stressLevel + input.anxietyLevel) / 4;

  let riskFactorCount = 0;
  if (input.appetiteChanges) riskFactorCount++;
  if (input.concentrationIssues) riskFactorCount++;
  if (input.negativeThoughts) riskFactorCount++;
  if (input.recentLifeEvent) riskFactorCount++;
  if (input.sleepHours < 5) riskFactorCount++;
  if (input.socialInteraction === 0) riskFactorCount++;
  if (input.stressLevel >= 4) riskFactorCount++;
  if (input.anxietyLevel >= 4) riskFactorCount++;

  return {
    moodEnergyRatio,
    stressAnxietyCombined,
    wellbeingIndex,
    riskFactorCount,
  };
}

/**
 * Calculate baseline mental health score using rules
 */
function calculateBaselineScore(input: MentalHealthInput): number {
  let score = 100;

  // Mood impact (high weight)
  score -= (5 - input.currentMood) * 10;

  // Stress and anxiety (high negative impact)
  score -= (input.stressLevel - 1) * 6;
  score -= (input.anxietyLevel - 1) * 6;

  // Energy and motivation (positive factors)
  score += (input.energyLevel - 3) * 3;
  score += (input.motivationLevel - 3) * 3;

  // Sleep quality
  score += (input.sleepQuality - 3) * 4;
  if (input.sleepHours < 5) {
    score -= 10;
  } else if (input.sleepHours < 6) {
    score -= 5;
  }

  // Social connection
  switch (input.socialInteraction) {
    case 0: // Isolated
      score -= 12;
      break;
    case 1: // Minimal
      score -= 5;
      break;
    case 3: // Active
      score += 5;
      break;
  }

  // Healthy habits bonuses
  if (input.exerciseFrequency >= 2) {
    score += 5;
  }
  if (input.meditationPractice) {
    score += 5;
  }

  // Risk factors penalties
  if (input.appetiteChanges) score -= 5;
  if (input.concentrationIssues) score -= 5;
  if (input.negativeThoughts) score -= 8;
  if (input.recentLifeEvent) score -= 5;

  // Work-life balance
  score += (input.workLifeBalance - 3) * 4;

  return Math.max(0, Math.min(100, score));
}

/**
 * Get coping strategies based on category
 */
const COPING_STRATEGIES: Record<string, string[]> = {
  Crisis: [
    'Please reach out to a mental health professional immediately',
    'Contact a crisis helpline: 988 (Suicide & Crisis Lifeline)',
    'Talk to someone you trust right now',
    'Focus on basic needs: eat, hydrate, rest',
  ],
  Struggling: [
    'Consider scheduling an appointment with a therapist',
    'Practice deep breathing exercises daily',
    'Reach out to supportive friends or family',
    'Limit stressors where possible',
  ],
  Coping: [
    'Continue your current self-care routine',
    'Add 10 minutes of mindfulness practice daily',
    'Monitor your stress triggers',
    'Maintain social connections',
  ],
  Healthy: [
    'Keep up your positive habits',
    'Consider helping others who may be struggling',
    'Try new wellness activities',
    'Build resilience for challenging times',
  ],
  Thriving: [
    'Share your strategies with others',
    'Set new personal growth goals',
    'Mentor others in wellness',
    'Maintain your excellent self-care routine',
  ],
};

/**
 * Identify wellbeing factors
 */
function identifyWellbeingFactors(input: MentalHealthInput): {
  positive: string[];
  needsAttention: string[];
} {
  const positive: string[] = [];
  const needsAttention: string[] = [];

  // Positive factors
  if (input.currentMood >= 4) positive.push('Good mood');
  if (input.energyLevel >= 4) positive.push('High energy');
  if (input.sleepQuality >= 4) positive.push('Quality sleep');
  if (input.exerciseFrequency >= 3) positive.push('Regular exercise');
  if (input.meditationPractice) positive.push('Mindfulness practice');
  if (input.socialInteraction >= 2) positive.push('Social connections');
  if (input.workLifeBalance >= 4) positive.push('Good work-life balance');

  // Needs attention
  if (input.stressLevel >= 4) needsAttention.push('High stress');
  if (input.anxietyLevel >= 4) needsAttention.push('Elevated anxiety');
  if (input.sleepHours < 6) needsAttention.push('Insufficient sleep');
  if (input.socialInteraction <= 1) needsAttention.push('Limited social interaction');
  if (input.negativeThoughts) needsAttention.push('Negative thought patterns');
  if (input.concentrationIssues) needsAttention.push('Focus difficulties');
  if (input.currentMood <= 2) needsAttention.push('Low mood');

  return { positive, needsAttention };
}

/**
 * Mental Health ML Model class
 */
export class MentalHealthModel {
  private model: RandomForestClassifier | null = null;
  private modelData: any = null;
  private mlWeight = 0.6;
  private baselineWeight = 0.4;

  /**
   * Load model from JSON data
   */
  loadModel(modelJson: RandomForestModel & { hybrid_weights?: { ml_weight: number; baseline_weight: number } }): void {
    this.model = new RandomForestClassifier(modelJson);
    this.modelData = modelJson;

    if (modelJson.hybrid_weights) {
      this.mlWeight = modelJson.hybrid_weights.ml_weight;
      this.baselineWeight = modelJson.hybrid_weights.baseline_weight;
    }
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.model !== null;
  }

  /**
   * Prepare features for model input
   */
  private prepareFeatures(input: MentalHealthInput): number[] {
    const derived = calculateDerivedFeatures(input);

    return [
      input.currentMood,
      input.stressLevel,
      input.anxietyLevel,
      input.energyLevel,
      input.motivationLevel,
      input.sleepQuality,
      input.sleepHours,
      input.socialInteraction,
      input.exerciseFrequency,
      input.meditationPractice ? 1 : 0,
      input.workLifeBalance,
      input.appetiteChanges ? 1 : 0,
      input.concentrationIssues ? 1 : 0,
      input.negativeThoughts ? 1 : 0,
      input.recentLifeEvent ? 1 : 0,
      derived.moodEnergyRatio,
      derived.stressAnxietyCombined,
      derived.wellbeingIndex,
      derived.riskFactorCount,
    ];
  }

  /**
   * Determine risk level based on score
   */
  private getRiskLevel(score: number): 'Low' | 'Moderate' | 'High' | 'Severe' {
    if (score >= 80) return 'Low';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'High';
    return 'Severe';
  }

  /**
   * Predict mental health score
   */
  predict(input: MentalHealthInput): MentalHealthResult {
    const baselineScore = calculateBaselineScore(input);

    let mlScore = baselineScore;
    let confidence = 0.5;

    if (this.model) {
      const features = this.prepareFeatures(input);
      const result = this.model.predictWithConfidence(features);

      // Convert class to score (0=Crisis, 1=Struggling, 2=Coping, 3=Healthy, 4=Thriving)
      // Class weights: [0, 25, 50, 75, 100]
      mlScore = probaToScore(result.probabilities, [0, 25, 50, 75, 100]);
      confidence = result.confidence;
    }

    const finalScore = Math.round(hybridScore(mlScore, baselineScore, this.mlWeight, this.baselineWeight));

    let category: 'Thriving' | 'Healthy' | 'Coping' | 'Struggling' | 'Crisis';
    if (finalScore >= 85) category = 'Thriving';
    else if (finalScore >= 70) category = 'Healthy';
    else if (finalScore >= 50) category = 'Coping';
    else if (finalScore >= 30) category = 'Struggling';
    else category = 'Crisis';

    const riskLevel = this.getRiskLevel(finalScore);
    const wellbeingFactors = identifyWellbeingFactors(input);
    const copingStrategies = COPING_STRATEGIES[category] || [];

    return {
      score: finalScore,
      category,
      riskLevel,
      mlScore,
      baselineScore,
      confidence,
      copingStrategies,
      wellbeingFactors,
    };
  }

  /**
   * Predict without ML model (baseline only)
   */
  predictBaseline(input: MentalHealthInput): MentalHealthResult {
    const baselineScore = calculateBaselineScore(input);

    let category: 'Thriving' | 'Healthy' | 'Coping' | 'Struggling' | 'Crisis';
    if (baselineScore >= 85) category = 'Thriving';
    else if (baselineScore >= 70) category = 'Healthy';
    else if (baselineScore >= 50) category = 'Coping';
    else if (baselineScore >= 30) category = 'Struggling';
    else category = 'Crisis';

    const riskLevel = this.getRiskLevel(baselineScore);
    const wellbeingFactors = identifyWellbeingFactors(input);
    const copingStrategies = COPING_STRATEGIES[category] || [];

    return {
      score: baselineScore,
      category,
      riskLevel,
      mlScore: baselineScore,
      baselineScore,
      confidence: 1.0,
      copingStrategies,
      wellbeingFactors,
    };
  }
}
