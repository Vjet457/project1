/**
 * Symptom Severity ML Model
 * 
 * Provides ML-based symptom severity classification using
 * Random Forest with urgency assessment and recommendations.
 */

import {
  RandomForestClassifier,
  RandomForestModel,
  hybridScore,
} from './RandomForestInference';

// Critical symptoms that indicate potential emergency
const CRITICAL_SYMPTOMS = ['chestPain', 'shortnessOfBreath', 'confusion'];

// Symptom weights for severity calculation
const SYMPTOM_WEIGHTS: Record<string, number> = {
  chestPain: 3.0,
  shortnessOfBreath: 2.5,
  confusion: 2.5,
  fever: 1.2,
  vomiting: 1.3,
  dizziness: 1.4,
  lossOfTasteSmell: 1.2,
  headache: 1.0,
  cough: 1.0,
  fatigue: 0.8,
  bodyAche: 0.8,
  nausea: 0.9,
  diarrhea: 0.9,
  soreThroat: 0.7,
  runnyNose: 0.6,
  abdominalPain: 1.1,
  rash: 0.8,
  jointPain: 0.8,
};

export interface SymptomInput {
  symptoms: {
    fever?: boolean;
    headache?: boolean;
    cough?: boolean;
    fatigue?: boolean;
    bodyAche?: boolean;
    nausea?: boolean;
    diarrhea?: boolean;
    vomiting?: boolean;
    shortnessOfBreath?: boolean;
    chestPain?: boolean;
    dizziness?: boolean;
    soreThroat?: boolean;
    runnyNose?: boolean;
    lossOfTasteSmell?: boolean;
    abdominalPain?: boolean;
    rash?: boolean;
    jointPain?: boolean;
    confusion?: boolean;
  };
  durationDays: number;
  intensity: number; // 1-5
  age: number;
  hasComorbidities?: boolean;
}

export interface SymptomResult {
  severity: 'Mild' | 'Moderate' | 'Severe';
  severityLevel: number; // 0, 1, 2
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  mlScore: number;
  baselineScore: number;
  confidence: number;
  hasCriticalSymptoms: boolean;
  criticalSymptomList: string[];
  recommendations: string[];
  emergencyIndicators: string[];
  action: string;
}

/**
 * Calculate derived features
 */
function calculateDerivedFeatures(input: SymptomInput): {
  symptomCount: number;
  criticalSymptoms: number;
  respiratorySymptoms: number;
  giSymptoms: number;
  neurologicalSymptoms: number;
  severityIndex: number;
} {
  const symptoms = input.symptoms;

  // Count symptoms
  let symptomCount = 0;
  for (const key of Object.keys(symptoms)) {
    if (symptoms[key as keyof typeof symptoms]) {
      symptomCount++;
    }
  }

  // Critical symptoms
  let criticalSymptoms = 0;
  if (symptoms.chestPain) criticalSymptoms++;
  if (symptoms.shortnessOfBreath) criticalSymptoms++;
  if (symptoms.confusion) criticalSymptoms++;

  // Respiratory symptoms
  let respiratorySymptoms = 0;
  if (symptoms.cough) respiratorySymptoms++;
  if (symptoms.shortnessOfBreath) respiratorySymptoms++;
  if (symptoms.soreThroat) respiratorySymptoms++;
  if (symptoms.runnyNose) respiratorySymptoms++;

  // GI symptoms
  let giSymptoms = 0;
  if (symptoms.nausea) giSymptoms++;
  if (symptoms.diarrhea) giSymptoms++;
  if (symptoms.vomiting) giSymptoms++;
  if (symptoms.abdominalPain) giSymptoms++;

  // Neurological symptoms
  let neurologicalSymptoms = 0;
  if (symptoms.headache) neurologicalSymptoms++;
  if (symptoms.dizziness) neurologicalSymptoms++;
  if (symptoms.confusion) neurologicalSymptoms++;

  // Calculate weighted severity index
  let severityIndex = 0;
  for (const [symptom, weight] of Object.entries(SYMPTOM_WEIGHTS)) {
    if (symptoms[symptom as keyof typeof symptoms]) {
      severityIndex += weight;
    }
  }

  // Add intensity and duration factors
  severityIndex *= 1 + input.intensity / 5;
  severityIndex *= Math.log1p(input.durationDays);

  // Age factor
  if (input.age >= 65) {
    severityIndex *= 1.3;
  } else if (input.age < 18) {
    severityIndex *= 1.1;
  }

  // Comorbidities factor
  if (input.hasComorbidities) {
    severityIndex *= 1.4;
  }

  return {
    symptomCount,
    criticalSymptoms,
    respiratorySymptoms,
    giSymptoms,
    neurologicalSymptoms,
    severityIndex,
  };
}

/**
 * Calculate baseline severity using rules
 */
function calculateBaselineSeverity(input: SymptomInput): number {
  const symptoms = input.symptoms;
  const derived = calculateDerivedFeatures(input);

  // Critical symptoms override
  if (symptoms.chestPain || symptoms.confusion) {
    return 2; // Severe
  }

  if (symptoms.shortnessOfBreath && input.intensity >= 4) {
    return 2; // Severe
  }

  // Calculate score
  let score = derived.symptomCount * 0.5;

  // Intensity factor
  score += input.intensity * 0.8;

  // Duration factor
  if (input.durationDays >= 7) {
    score += 2;
  } else if (input.durationDays >= 3) {
    score += 1;
  }

  // Age factor
  if (input.age >= 70) {
    score += 1.5;
  } else if (input.age >= 60) {
    score += 1;
  } else if (input.age < 5) {
    score += 1.5;
  }

  // Comorbidities
  if (input.hasComorbidities) {
    score += 1.5;
  }

  // Weight critical symptoms
  if (symptoms.chestPain) score += 3;
  if (symptoms.shortnessOfBreath) score += 2;
  if (symptoms.confusion) score += 2;
  if (symptoms.vomiting) score += 0.5;
  if (symptoms.fever) score += 0.5;

  // Categorize
  if (score >= 8) {
    return 2; // Severe
  } else if (score >= 4) {
    return 1; // Moderate
  } else {
    return 0; // Mild
  }
}

// Recommendations based on severity
const RECOMMENDATIONS: Record<string, { urgency: string; action: string; tips: string[] }> = {
  Mild: {
    urgency: 'Low',
    action: 'Monitor symptoms at home',
    tips: [
      'Rest and stay hydrated',
      'Take over-the-counter medications as needed',
      'Monitor for worsening symptoms',
      'See a doctor if symptoms persist beyond 5-7 days',
    ],
  },
  Moderate: {
    urgency: 'Medium',
    action: 'Schedule a doctor appointment',
    tips: [
      'Contact your primary care physician',
      'Keep track of all symptoms and their progression',
      'Avoid strenuous activities',
      'Seek urgent care if symptoms worsen rapidly',
    ],
  },
  Severe: {
    urgency: 'High',
    action: 'Seek immediate medical attention',
    tips: [
      'Go to the emergency room or call emergency services',
      'Do not drive yourself if experiencing chest pain or confusion',
      'Inform medical staff of all symptoms',
      'Bring a list of current medications',
    ],
  },
};

const EMERGENCY_INDICATORS = [
  'Severe chest pain',
  'Difficulty breathing',
  'Confusion or altered consciousness',
  'Inability to keep fluids down',
  'High fever that does not respond to medication',
  'Severe abdominal pain',
  'Signs of dehydration',
];

/**
 * Symptom Severity ML Model class
 */
export class SymptomSeverityModel {
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
  private prepareFeatures(input: SymptomInput): number[] {
    const symptoms = input.symptoms;
    const derived = calculateDerivedFeatures(input);

    return [
      symptoms.fever ? 1 : 0,
      symptoms.headache ? 1 : 0,
      symptoms.cough ? 1 : 0,
      symptoms.fatigue ? 1 : 0,
      symptoms.bodyAche ? 1 : 0,
      symptoms.nausea ? 1 : 0,
      symptoms.diarrhea ? 1 : 0,
      symptoms.vomiting ? 1 : 0,
      symptoms.shortnessOfBreath ? 1 : 0,
      symptoms.chestPain ? 1 : 0,
      symptoms.dizziness ? 1 : 0,
      symptoms.soreThroat ? 1 : 0,
      symptoms.runnyNose ? 1 : 0,
      symptoms.lossOfTasteSmell ? 1 : 0,
      symptoms.abdominalPain ? 1 : 0,
      symptoms.rash ? 1 : 0,
      symptoms.jointPain ? 1 : 0,
      symptoms.confusion ? 1 : 0,
      derived.symptomCount,
      input.durationDays,
      input.intensity,
      input.age,
      input.hasComorbidities ? 1 : 0,
      derived.criticalSymptoms,
      derived.respiratorySymptoms,
      derived.giSymptoms,
      derived.neurologicalSymptoms,
      derived.severityIndex,
    ];
  }

  /**
   * Get critical symptoms present
   */
  private getCriticalSymptoms(input: SymptomInput): string[] {
    const critical: string[] = [];
    if (input.symptoms.chestPain) critical.push('Chest pain');
    if (input.symptoms.shortnessOfBreath) critical.push('Shortness of breath');
    if (input.symptoms.confusion) critical.push('Confusion');
    return critical;
  }

  /**
   * Predict symptom severity
   */
  predict(input: SymptomInput): SymptomResult {
    const baselineSeverity = calculateBaselineSeverity(input);
    const criticalSymptomList = this.getCriticalSymptoms(input);
    const hasCriticalSymptoms = criticalSymptomList.length > 0;

    let mlSeverity = baselineSeverity;
    let confidence = 0.5;

    if (this.model) {
      const features = this.prepareFeatures(input);
      const result = this.model.predictWithConfidence(features);
      mlSeverity = result.prediction;
      confidence = result.confidence;
    }

    // Hybrid score
    const hybridSeverity = Math.round(
      hybridScore(mlSeverity, baselineSeverity, this.mlWeight, this.baselineWeight)
    );

    // Ensure critical symptoms result in at least Moderate
    const finalSeverity = hasCriticalSymptoms ? Math.max(hybridSeverity, 1) : hybridSeverity;

    let severity: 'Mild' | 'Moderate' | 'Severe';
    if (finalSeverity >= 2) severity = 'Severe';
    else if (finalSeverity >= 1) severity = 'Moderate';
    else severity = 'Mild';

    const recs = RECOMMENDATIONS[severity];

    // Determine urgency
    let urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
    if (hasCriticalSymptoms && input.intensity >= 4) {
      urgency = 'Emergency';
    } else if (severity === 'Severe') {
      urgency = 'High';
    } else if (severity === 'Moderate') {
      urgency = 'Medium';
    } else {
      urgency = 'Low';
    }

    return {
      severity,
      severityLevel: finalSeverity,
      urgency,
      mlScore: mlSeverity,
      baselineScore: baselineSeverity,
      confidence,
      hasCriticalSymptoms,
      criticalSymptomList,
      recommendations: recs.tips,
      emergencyIndicators: hasCriticalSymptoms ? EMERGENCY_INDICATORS : [],
      action: urgency === 'Emergency' ? 'Call 911 or go to emergency room immediately' : recs.action,
    };
  }

  /**
   * Predict without ML model (baseline only)
   */
  predictBaseline(input: SymptomInput): SymptomResult {
    const baselineSeverity = calculateBaselineSeverity(input);
    const criticalSymptomList = this.getCriticalSymptoms(input);
    const hasCriticalSymptoms = criticalSymptomList.length > 0;

    const finalSeverity = hasCriticalSymptoms ? Math.max(baselineSeverity, 1) : baselineSeverity;

    let severity: 'Mild' | 'Moderate' | 'Severe';
    if (finalSeverity >= 2) severity = 'Severe';
    else if (finalSeverity >= 1) severity = 'Moderate';
    else severity = 'Mild';

    const recs = RECOMMENDATIONS[severity];

    let urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
    if (hasCriticalSymptoms && input.intensity >= 4) {
      urgency = 'Emergency';
    } else if (severity === 'Severe') {
      urgency = 'High';
    } else if (severity === 'Moderate') {
      urgency = 'Medium';
    } else {
      urgency = 'Low';
    }

    return {
      severity,
      severityLevel: finalSeverity,
      urgency,
      mlScore: baselineSeverity,
      baselineScore: baselineSeverity,
      confidence: 1.0,
      hasCriticalSymptoms,
      criticalSymptomList,
      recommendations: recs.tips,
      emergencyIndicators: hasCriticalSymptoms ? EMERGENCY_INDICATORS : [],
      action: urgency === 'Emergency' ? 'Call 911 or go to emergency room immediately' : recs.action,
    };
  }
}
