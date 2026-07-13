/**
 * Physical Health ML Model
 * 
 * Provides ML-based physical health score prediction using
 * Random Forest with baseline deviation algorithm.
 */

import {
  RandomForestClassifier,
  RandomForestModel,
  hybridScore,
  probaToScore,
} from './RandomForestInference';

// Baseline values for deviation calculation
const BASELINE_VALUES = {
  heart_rate: 72,
  bp_systolic: 120,
  bp_diastolic: 80,
  blood_oxygen: 98,
  body_temperature: 98.6,
  daily_steps: 8000,
  sleep_hours: 7.5,
  bmi: 22,
};

export interface PhysicalHealthInput {
  heartRate: number;
  bpSystolic: number;
  bpDiastolic: number;
  bloodOxygen: number;
  bodyTemperature: number;
  respiratoryRate: number;
  dailySteps: number;
  activeMinutes: number;
  sleepHours: number;
  sleepQuality: number;
  bmi: number;
  waterIntake: number;
  age: number;
  gender: 'male' | 'female';
  smoking: boolean;
  alcohol: boolean;
}

export interface PhysicalHealthResult {
  score: number;
  category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  mlScore: number;
  baselineScore: number;
  confidence: number;
  deviations: Record<string, number>;
  recommendations: string[];
}

/**
 * Calculate baseline physical health score using rules
 */
function calculateBaselineScore(input: PhysicalHealthInput): number {
  let score = 100;

  // Heart rate deviations
  if (input.heartRate < 60) {
    score -= 15;
  } else if (input.heartRate > 100) {
    score -= 20;
  } else if (input.heartRate < 65 || input.heartRate > 85) {
    score -= 5;
  }

  // Blood pressure
  if (input.bpSystolic > 140 || input.bpDiastolic > 90) {
    score -= 20;
  } else if (input.bpSystolic > 130 || input.bpDiastolic > 85) {
    score -= 10;
  } else if (input.bpSystolic < 90 || input.bpDiastolic < 60) {
    score -= 15;
  }

  // Blood oxygen
  if (input.bloodOxygen < 92) {
    score -= 25;
  } else if (input.bloodOxygen < 95) {
    score -= 15;
  } else if (input.bloodOxygen < 97) {
    score -= 5;
  }

  // Body temperature
  if (input.bodyTemperature > 100.4) {
    score -= 20;
  } else if (input.bodyTemperature > 99.5 || input.bodyTemperature < 97) {
    score -= 10;
  }

  // Activity
  if (input.dailySteps >= 10000) {
    score += 5;
  } else if (input.dailySteps < 3000) {
    score -= 10;
  }

  if (input.activeMinutes >= 60) {
    score += 5;
  } else if (input.activeMinutes < 15) {
    score -= 10;
  }

  // Sleep
  if (input.sleepHours >= 7 && input.sleepHours <= 9) {
    score += 5;
  } else if (input.sleepHours < 5 || input.sleepHours > 10) {
    score -= 10;
  }

  if (input.sleepQuality >= 4) {
    score += 5;
  } else if (input.sleepQuality <= 2) {
    score -= 8;
  }

  // BMI
  if (input.bmi >= 18.5 && input.bmi <= 24.9) {
    score += 5;
  } else if (input.bmi >= 30) {
    score -= 15;
  } else if (input.bmi < 18.5 || input.bmi >= 25) {
    score -= 8;
  }

  // Hydration
  if (input.waterIntake >= 8) {
    score += 3;
  } else if (input.waterIntake < 4) {
    score -= 8;
  }

  // Lifestyle factors
  if (input.smoking) {
    score -= 15;
  }
  if (input.alcohol) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate deviations from baseline values.
 * Matches the Python training script exactly: raw absolute differences,
 * with steps_deviation additionally divided by 1000 to match training scale.
 */
function calculateDeviations(input: PhysicalHealthInput): Record<string, number> {
  return {
    hr_deviation: Math.abs(input.heartRate - BASELINE_VALUES.heart_rate),
    bp_sys_deviation: Math.abs(input.bpSystolic - BASELINE_VALUES.bp_systolic),
    bp_dia_deviation: Math.abs(input.bpDiastolic - BASELINE_VALUES.bp_diastolic),
    oxygen_deviation: Math.abs(input.bloodOxygen - BASELINE_VALUES.blood_oxygen),
    temp_deviation: Math.abs(input.bodyTemperature - BASELINE_VALUES.body_temperature),
    steps_deviation: Math.abs(input.dailySteps - BASELINE_VALUES.daily_steps) / 1000,
    sleep_deviation: Math.abs(input.sleepHours - BASELINE_VALUES.sleep_hours),
    bmi_deviation: Math.abs(input.bmi - BASELINE_VALUES.bmi),
  };
}

/**
 * Generate recommendations based on input
 */
function generateRecommendations(input: PhysicalHealthInput, score: number): string[] {
  const recommendations: string[] = [];

  if (input.dailySteps < 7000) {
    recommendations.push('Try to increase daily steps to at least 7,000-10,000');
  }

  if (input.sleepHours < 7) {
    recommendations.push('Aim for 7-9 hours of quality sleep each night');
  }

  if (input.waterIntake < 8) {
    recommendations.push('Increase water intake to at least 8 glasses per day');
  }

  if (input.bpSystolic > 130) {
    recommendations.push('Monitor blood pressure regularly and consider dietary changes');
  }

  if (input.bmi > 25) {
    recommendations.push('Consider a balanced diet and regular exercise for weight management');
  }

  if (input.activeMinutes < 30) {
    recommendations.push('Try to get at least 30 minutes of moderate activity daily');
  }

  if (score < 50) {
    recommendations.push('Consider consulting a healthcare professional for a check-up');
  }

  return recommendations.slice(0, 4);
}

/**
 * Physical Health ML Model class
 */
export class PhysicalHealthModel {
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
  private prepareFeatures(input: PhysicalHealthInput): number[] {
    const deviations = calculateDeviations(input);

    return [
      input.heartRate,
      input.bpSystolic,
      input.bpDiastolic,
      input.bloodOxygen,
      input.bodyTemperature,
      input.respiratoryRate,
      input.dailySteps,
      input.activeMinutes,
      input.sleepHours,
      input.sleepQuality,
      input.bmi,
      input.waterIntake,
      input.age,
      input.gender === 'male' ? 1 : 0,   // 14: 1=male, 0=female (matches training)
      input.smoking ? 1 : 0,              // 15
      input.alcohol ? 1 : 0,              // 16
      deviations.hr_deviation,            // 17
      deviations.bp_sys_deviation,        // 18
      deviations.bp_dia_deviation,        // 19
      deviations.oxygen_deviation,        // 20
      deviations.temp_deviation,          // 21
      deviations.steps_deviation,         // 22
      deviations.sleep_deviation,         // 23
      deviations.bmi_deviation,           // 24
    ];
  }

  /**
   * Predict physical health score
   */
  predict(input: PhysicalHealthInput): PhysicalHealthResult {
    const baselineScore = calculateBaselineScore(input);
    const deviations = calculateDeviations(input);

    let mlScore = baselineScore;
    let confidence = 0.5;

    if (this.model) {
      const features = this.prepareFeatures(input);
      const result = this.model.predictWithConfidence(features);

      // Convert class to score (0=Poor, 1=Fair, 2=Good, 3=Excellent)
      // Class weights: [0, 33, 67, 100]
      mlScore = probaToScore(result.probabilities, [0, 33, 67, 100]);
      confidence = result.confidence;
    }

    const finalScore = Math.round(hybridScore(mlScore, baselineScore, this.mlWeight, this.baselineWeight));

    let category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (finalScore >= 85) category = 'Excellent';
    else if (finalScore >= 70) category = 'Good';
    else if (finalScore >= 50) category = 'Fair';
    else category = 'Poor';

    return {
      score: finalScore,
      category,
      mlScore,
      baselineScore,
      confidence,
      deviations,
      recommendations: generateRecommendations(input, finalScore),
    };
  }

  /**
   * Predict without ML model (baseline only)
   */
  predictBaseline(input: PhysicalHealthInput): PhysicalHealthResult {
    const baselineScore = calculateBaselineScore(input);
    const deviations = calculateDeviations(input);

    let category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (baselineScore >= 85) category = 'Excellent';
    else if (baselineScore >= 70) category = 'Good';
    else if (baselineScore >= 50) category = 'Fair';
    else category = 'Poor';

    return {
      score: baselineScore,
      category,
      mlScore: baselineScore,
      baselineScore,
      confidence: 1.0,
      deviations,
      recommendations: generateRecommendations(input, baselineScore),
    };
  }
}
