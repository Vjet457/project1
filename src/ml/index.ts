/**
 * ML Module Index
 * 
 * Export all ML models and provide a unified interface for health predictions.
 */

// Core inference engine
export {
  RandomForestClassifier,
  StandardScaler,
  DecisionTreeInference,
  hybridScore,
  probaToScore,
  calculateDeviation,
} from './RandomForestInference';
export type {
  RandomForestModel,
  DecisionTree,
  ScalerParams,
} from './RandomForestInference';

// Model classes
export { PhysicalHealthModel } from './PhysicalHealthModel';
export type { PhysicalHealthInput, PhysicalHealthResult } from './PhysicalHealthModel';

export { MentalHealthModel } from './MentalHealthModel';
export type { MentalHealthInput, MentalHealthResult } from './MentalHealthModel';

export { SymptomSeverityModel } from './SymptomSeverityModel';
export type { SymptomInput, SymptomResult } from './SymptomSeverityModel';

// Import models for the manager
import { PhysicalHealthModel, PhysicalHealthInput, PhysicalHealthResult } from './PhysicalHealthModel';
import { MentalHealthModel, MentalHealthInput, MentalHealthResult } from './MentalHealthModel';
import { SymptomSeverityModel, SymptomInput, SymptomResult } from './SymptomSeverityModel';
import { RandomForestModel } from './RandomForestInference';

/**
 * Overall Health Score Result
 */
export interface OverallHealthResult {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  physicalScore: number;
  mentalScore: number;
  trend: 'improving' | 'stable' | 'declining';
  topConcerns: string[];
  recommendations: string[];
}

/**
 * ML Model Manager
 * 
 * Provides a unified interface for all ML models with automatic
 * fallback to baseline scoring when models are not loaded.
 */
export class MLModelManager {
  private physicalModel: PhysicalHealthModel;
  private mentalModel: MentalHealthModel;
  private symptomModel: SymptomSeverityModel;
  private modelsLoaded = {
    physical: false,
    mental: false,
    symptom: false,
  };

  constructor() {
    this.physicalModel = new PhysicalHealthModel();
    this.mentalModel = new MentalHealthModel();
    this.symptomModel = new SymptomSeverityModel();
  }

  /**
   * Load physical health model from JSON
   */
  loadPhysicalModel(modelJson: RandomForestModel): void {
    this.physicalModel.loadModel(modelJson);
    this.modelsLoaded.physical = true;
  }

  /**
   * Load mental health model from JSON
   */
  loadMentalModel(modelJson: RandomForestModel): void {
    this.mentalModel.loadModel(modelJson);
    this.modelsLoaded.mental = true;
  }

  /**
   * Load symptom severity model from JSON
   */
  loadSymptomModel(modelJson: RandomForestModel): void {
    this.symptomModel.loadModel(modelJson);
    this.modelsLoaded.symptom = true;
  }

  /**
   * Check which models are loaded
   */
  getLoadedModels(): typeof this.modelsLoaded {
    return { ...this.modelsLoaded };
  }

  /**
   * Predict physical health score
   * Falls back to baseline if model not loaded
   */
  predictPhysicalHealth(input: PhysicalHealthInput): PhysicalHealthResult {
    if (this.modelsLoaded.physical) {
      return this.physicalModel.predict(input);
    }
    return this.physicalModel.predictBaseline(input);
  }

  /**
   * Predict mental health score
   * Falls back to baseline if model not loaded
   */
  predictMentalHealth(input: MentalHealthInput): MentalHealthResult {
    if (this.modelsLoaded.mental) {
      return this.mentalModel.predict(input);
    }
    return this.mentalModel.predictBaseline(input);
  }

  /**
   * Predict symptom severity
   * Falls back to baseline if model not loaded
   */
  predictSymptomSeverity(input: SymptomInput): SymptomResult {
    if (this.modelsLoaded.symptom) {
      return this.symptomModel.predict(input);
    }
    return this.symptomModel.predictBaseline(input);
  }

  /**
   * Calculate overall health score combining physical and mental
   */
  calculateOverallHealth(
    physicalInput: PhysicalHealthInput,
    mentalInput: MentalHealthInput,
    previousScore?: number
  ): OverallHealthResult {
    const physicalResult = this.predictPhysicalHealth(physicalInput);
    const mentalResult = this.predictMentalHealth(mentalInput);

    // Weighted average: 50% physical, 50% mental
    const overallScore = Math.round(
      physicalResult.score * 0.5 + mentalResult.score * 0.5
    );

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (previousScore !== undefined) {
      const diff = overallScore - previousScore;
      if (diff >= 5) trend = 'improving';
      else if (diff <= -5) trend = 'declining';
    }

    // Collect top concerns
    const topConcerns: string[] = [];
    if (mentalResult.riskLevel === 'High' || mentalResult.riskLevel === 'Severe') {
      topConcerns.push('Mental health needs attention');
    }
    if (physicalResult.category === 'Poor') {
      topConcerns.push('Physical health needs improvement');
    }
    topConcerns.push(...mentalResult.wellbeingFactors.needsAttention.slice(0, 2));

    // Combine recommendations
    const recommendations = [
      ...physicalResult.recommendations.slice(0, 2),
      ...mentalResult.copingStrategies.slice(0, 2),
    ];

    return {
      overallScore,
      grade,
      physicalScore: physicalResult.score,
      mentalScore: mentalResult.score,
      trend,
      topConcerns: topConcerns.slice(0, 3),
      recommendations: recommendations.slice(0, 4),
    };
  }
}

// Singleton instance for easy access
let modelManagerInstance: MLModelManager | null = null;

/**
 * Get the singleton MLModelManager instance
 */
export function getMLModelManager(): MLModelManager {
  if (!modelManagerInstance) {
    modelManagerInstance = new MLModelManager();
  }
  return modelManagerInstance;
}

// Re-export model loader utilities
export {
  loadMLModels,
  areModelsLoaded,
  getModelStatus,
  unloadModels,
} from './modelLoader';

/**
 * Initialize models from bundled JSON files
 * Call this during app initialization
 */
export async function initializeMLModels(): Promise<void> {
  const { loadMLModels } = await import('./modelLoader');
  await loadMLModels();
}
