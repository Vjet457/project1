/**
 * ML Model Loader
 * 
 * Loads trained ML models from bundled assets and initializes
 * the ML inference engine for health predictions.
 */

import { getMLModelManager, RandomForestModel } from '../ml';

// Import models directly - React Native bundles JSON files
// Note: For large models, consider loading from AsyncStorage or downloading on-demand
let physicalHealthModel: RandomForestModel | null = null;
let mentalHealthModel: RandomForestModel | null = null;
let symptomSeverityModel: RandomForestModel | null = null;

// Lazy load flags
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Load all ML models from bundled assets.
 * Call this during app initialization.
 */
export async function loadMLModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      console.log('[ML] Loading models...');
      const manager = getMLModelManager();

      // Use require() for JSON so this works in both app runtime and Jest.
      const physical = require('../../assets/ml-models/physical_health_model.json');
      const mental = require('../../assets/ml-models/mental_health_model.json');
      const symptom = require('../../assets/ml-models/symptom_severity_model.json');

      physicalHealthModel = (physical.default || physical) as RandomForestModel;
      mentalHealthModel = (mental.default || mental) as RandomForestModel;
      symptomSeverityModel = (symptom.default || symptom) as RandomForestModel;

      // Load into manager
      if (physicalHealthModel) {
        manager.loadPhysicalModel(physicalHealthModel);
        console.log('[ML] Physical health model loaded');
      }

      if (mentalHealthModel) {
        manager.loadMentalModel(mentalHealthModel);
        console.log('[ML] Mental health model loaded');
      }

      if (symptomSeverityModel) {
        manager.loadSymptomModel(symptomSeverityModel);
        console.log('[ML] Symptom severity model loaded');
      }

      modelsLoaded = true;
      console.log('[ML] All models loaded successfully');
    } catch (error) {
      console.error('[ML] Error loading models:', error);
      console.log('[ML] Falling back to baseline scoring');
      // App will use baseline scoring as fallback
    }
  })();

  return loadingPromise;
}

/**
 * Check if ML models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Get model loading status
 */
export function getModelStatus(): {
  loaded: boolean;
  physical: boolean;
  mental: boolean;
  symptom: boolean;
} {
  const manager = getMLModelManager();
  const status = manager.getLoadedModels();
  
  return {
    loaded: modelsLoaded,
    physical: status.physical,
    mental: status.mental,
    symptom: status.symptom,
  };
}

/**
 * Unload models to free memory (if needed)
 */
export function unloadModels(): void {
  physicalHealthModel = null;
  mentalHealthModel = null;
  symptomSeverityModel = null;
  modelsLoaded = false;
  loadingPromise = null;
  console.log('[ML] Models unloaded');
}
