/**
 * ML Health Service Bridge
 * 
 * Bridges the new ML module with the existing aiHealthService,
 * providing enhanced predictions using trained ML models.
 */

import {
  getMLModelManager,
  PhysicalHealthInput as MLPhysicalInput,
  MentalHealthInput as MLMentalInput,
  SymptomInput as MLSymptomInput,
  PhysicalHealthResult,
  MentalHealthResult,
  SymptomResult,
  OverallHealthResult,
} from '../ml';

import {
  PhysicalHealthInput,
  MentalHealthInput,
  PhysicalHealthScore,
  MentalHealthScore,
  Symptom,
  SymptomSeverityResult,
} from './aiHealthService';

/**
 * Convert aiHealthService PhysicalHealthInput to ML module format
 */
function convertToMLPhysicalInput(input: PhysicalHealthInput): MLPhysicalInput {
  return {
    heartRate: input.heartRate ?? 72,
    bpSystolic: input.bloodPressureSystolic ?? 120,
    bpDiastolic: input.bloodPressureDiastolic ?? 80,
    bloodOxygen: input.bloodOxygen ?? 98,
    bodyTemperature: input.bodyTemperature ?? 98.6,
    respiratoryRate: input.respiratoryRate ?? 14,
    dailySteps: input.dailySteps ?? 5000,
    activeMinutes: input.activeMinutes ?? 30,
    sleepHours: input.sleepHours ?? 7,
    sleepQuality: input.sleepQuality ?? 3,
    bmi: input.bmi ?? 22,
    waterIntake: input.waterIntake ?? 8,
    age: input.age ?? 30,
    gender: (input.gender === 'male' || input.gender === 'female') ? input.gender : 'male',
    smoking: input.smokingStatus === 'current',
    alcohol: input.alcoholConsumption === 'heavy' || input.alcoholConsumption === 'moderate',
  };
}

/**
 * Convert aiHealthService MentalHealthInput to ML module format
 */
function convertToMLMentalInput(input: MentalHealthInput): MLMentalInput {
  return {
    currentMood: input.currentMood,
    stressLevel: input.stressLevel,
    anxietyLevel: input.anxietyLevel,
    energyLevel: input.energyLevel,
    motivationLevel: input.motivationLevel,
    sleepQuality: input.sleepQuality ?? 3,
    sleepHours: input.sleepHours ?? 7,
    socialInteraction:
      input.socialInteraction === 'active' ? 3 :
      input.socialInteraction === 'moderate' ? 2 :
      input.socialInteraction === 'minimal' ? 1 : 0,
    exerciseFrequency:
      input.exerciseFrequency === 'daily' ? 4 :
      input.exerciseFrequency === 'weekly' ? 2 :
      input.exerciseFrequency === 'rarely' ? 1 : 0,
    meditationPractice: input.meditationPractice ?? false,
    workLifeBalance: input.workLifeBalance ?? 3,
    appetiteChanges: input.hasAppetiteChanges ?? false,
    concentrationIssues: input.hasConcentrationIssues ?? false,
    negativeThoughts: input.hasNegativeThoughts ?? false,
    recentLifeEvent: input.recentMajorLifeEvent ?? false,
  };
}

/**
 * Convert Symptom array to ML module format
 */
function convertToMLSymptomInput(symptoms: Symptom[], age?: number): MLSymptomInput {
  // Map symptom names to the expected format
  const symptomMap: Record<string, keyof MLSymptomInput['symptoms']> = {
    'fever': 'fever',
    'high_fever': 'fever',
    'headache': 'headache',
    'severe_headache': 'headache',
    'mild_headache': 'headache',
    'cough': 'cough',
    'fatigue': 'fatigue',
    'body_ache': 'bodyAche',
    'body_aches': 'bodyAche',
    'nausea': 'nausea',
    'diarrhea': 'diarrhea',
    'vomiting': 'vomiting',
    'persistent_vomiting': 'vomiting',
    'difficulty_breathing': 'shortnessOfBreath',
    'shortness_of_breath': 'shortnessOfBreath',
    'chest_pain': 'chestPain',
    'dizziness': 'dizziness',
    'sore_throat': 'soreThroat',
    'runny_nose': 'runnyNose',
    'loss_of_taste_smell': 'lossOfTasteSmell',
    'abdominal_pain': 'abdominalPain',
    'severe_abdominal_pain': 'abdominalPain',
    'rash': 'rash',
    'joint_pain': 'jointPain',
    'confusion': 'confusion',
  };

  const mlSymptoms: MLSymptomInput['symptoms'] = {};
  let maxIntensity = 1;
  let totalDurationDays = 0;

  symptoms.forEach(symptom => {
    const normalizedName = symptom.name.toLowerCase().replace(/\s+/g, '_');
    const mlKey = symptomMap[normalizedName];
    
    if (mlKey) {
      mlSymptoms[mlKey] = true;
    }

    // Track max intensity
    if (symptom.intensity > maxIntensity) {
      maxIntensity = symptom.intensity;
    }

    // Convert duration to days
    let durationDays = symptom.durationValue;
    if (symptom.duration === 'hours') {
      durationDays = symptom.durationValue / 24;
    } else if (symptom.duration === 'weeks') {
      durationDays = symptom.durationValue * 7;
    } else if (symptom.duration === 'months') {
      durationDays = symptom.durationValue * 30;
    }

    if (durationDays > totalDurationDays) {
      totalDurationDays = durationDays;
    }
  });

  return {
    symptoms: mlSymptoms,
    durationDays: Math.max(1, Math.round(totalDurationDays)),
    intensity: maxIntensity,
    age: age ?? 30,
    hasComorbidities: false,
  };
}

/**
 * Convert ML PhysicalHealthResult to aiHealthService format
 */
function convertFromMLPhysicalResult(result: PhysicalHealthResult): Partial<PhysicalHealthScore> {
  const grade =
    result.score >= 90 ? 'A' :
    result.score >= 80 ? 'B' :
    result.score >= 70 ? 'C' :
    result.score >= 60 ? 'D' : 'F';

  const status =
    result.category === 'Excellent' ? 'excellent' :
    result.category === 'Good' ? 'good' :
    result.category === 'Fair' ? 'fair' : 'poor';

  return {
    overallScore: result.score,
    grade,
    status,
    recommendations: result.recommendations,
    trend: 'stable',
  };
}

/**
 * Convert ML MentalHealthResult to aiHealthService format
 */
function convertFromMLMentalResult(result: MentalHealthResult): Partial<MentalHealthScore> {
  const status =
    result.category === 'Thriving' ? 'thriving' :
    result.category === 'Healthy' ? 'healthy' :
    result.category === 'Coping' ? 'coping' :
    result.category === 'Struggling' ? 'struggling' : 'crisis';

  const riskLevel =
    result.riskLevel === 'Low' ? 'low' :
    result.riskLevel === 'Moderate' ? 'moderate' :
    result.riskLevel === 'High' ? 'high' : 'severe';

  return {
    overallScore: result.score,
    status,
    riskLevel,
    copingStrategies: result.copingStrategies,
    recommendations: result.copingStrategies,
    professionalHelpRecommended: result.riskLevel === 'High' || result.riskLevel === 'Severe',
    crisisResources: result.riskLevel === 'Severe' ? [
      'National Suicide Prevention Lifeline: 988',
      'Crisis Text Line: Text HOME to 741741',
      'SAMHSA National Helpline: 1-800-662-4357',
    ] : undefined,
  };
}

/**
 * Convert ML SymptomResult to aiHealthService format
 */
function convertFromMLSymptomResult(result: SymptomResult): Partial<SymptomSeverityResult> {
  const overallSeverity =
    result.severity === 'Severe' ? (result.urgency === 'Emergency' ? 'critical' : 'severe') :
    result.severity === 'Moderate' ? 'moderate' : 'mild';

  const urgencyLevel =
    result.urgency === 'Emergency' ? 'emergency' :
    result.urgency === 'High' ? 'high' :
    result.urgency === 'Medium' ? 'medium' : 'low';

  return {
    overallSeverity,
    severityScore: (result.severityLevel + 1) * 33,
    urgencyLevel,
    recommendation: result.action,
    shouldSeekMedicalAttention: result.urgency === 'High' || result.urgency === 'Emergency',
    redFlags: result.criticalSymptomList,
  };
}

// ==================== PUBLIC API ====================

/**
 * Get enhanced physical health score using ML model
 */
export function getMLPhysicalHealthScore(input: PhysicalHealthInput): PhysicalHealthResult {
  const manager = getMLModelManager();
  const mlInput = convertToMLPhysicalInput(input);
  return manager.predictPhysicalHealth(mlInput);
}

/**
 * Get enhanced mental health score using ML model
 */
export function getMLMentalHealthScore(input: MentalHealthInput): MentalHealthResult {
  const manager = getMLModelManager();
  const mlInput = convertToMLMentalInput(input);
  return manager.predictMentalHealth(mlInput);
}

/**
 * Get enhanced symptom severity using ML model
 */
export function getMLSymptomSeverity(symptoms: Symptom[], age?: number): SymptomResult {
  const manager = getMLModelManager();
  const mlInput = convertToMLSymptomInput(symptoms, age);
  return manager.predictSymptomSeverity(mlInput);
}

/**
 * Get overall health score combining physical and mental using ML
 */
export function getMLOverallHealth(
  physicalInput: PhysicalHealthInput,
  mentalInput: MentalHealthInput,
  previousScore?: number
): OverallHealthResult {
  const manager = getMLModelManager();
  const mlPhysicalInput = convertToMLPhysicalInput(physicalInput);
  const mlMentalInput = convertToMLMentalInput(mentalInput);
  return manager.calculateOverallHealth(mlPhysicalInput, mlMentalInput, previousScore);
}

/**
 * Check if ML models are loaded
 */
export function areMLModelsLoaded(): { physical: boolean; mental: boolean; symptom: boolean } {
  return getMLModelManager().getLoadedModels();
}
