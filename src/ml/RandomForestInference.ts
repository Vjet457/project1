/**
 * Random Forest Inference Engine for React Native
 * 
 * This module provides pure TypeScript inference for Random Forest models
 * exported from scikit-learn as JSON files.
 */

export interface DecisionTree {
  n_nodes: number;
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  value: number[][][];
}

export interface ScalerParams {
  mean: number[];
  scale: number[];
}

export interface RandomForestModel {
  model_type: string;
  n_estimators: number;
  n_classes: number;
  classes: number[];
  feature_names: string[];
  trees: DecisionTree[];
  scaler: ScalerParams;
}

/**
 * StandardScaler implementation matching scikit-learn
 */
export class StandardScaler {
  private mean: number[];
  private scale: number[];

  constructor(params: ScalerParams) {
    this.mean = params.mean;
    this.scale = params.scale;
  }

  /**
   * Transform features using stored mean and scale
   */
  transform(features: number[]): number[] {
    if (features.length !== this.mean.length) {
      throw new Error(
        `Feature dimension mismatch: expected ${this.mean.length}, got ${features.length}`
      );
    }

    return features.map((value, i) => {
      // Handle division by zero
      if (this.scale[i] === 0) {
        return 0;
      }
      return (value - this.mean[i]) / this.scale[i];
    });
  }

  /**
   * Inverse transform to get original values
   */
  inverseTransform(scaledFeatures: number[]): number[] {
    return scaledFeatures.map((value, i) => {
      return value * this.scale[i] + this.mean[i];
    });
  }
}

/**
 * Decision Tree inference implementation
 */
export class DecisionTreeInference {
  private tree: DecisionTree;

  constructor(tree: DecisionTree) {
    this.tree = tree;
  }

  /**
   * Predict class probabilities for a single sample
   */
  predictProba(features: number[]): number[] {
    let nodeIndex = 0;

    // Traverse tree until leaf node
    while (this.tree.children_left[nodeIndex] !== -1) {
      const featureIndex = this.tree.feature[nodeIndex];
      const threshold = this.tree.threshold[nodeIndex];

      if (features[featureIndex] <= threshold) {
        nodeIndex = this.tree.children_left[nodeIndex];
      } else {
        nodeIndex = this.tree.children_right[nodeIndex];
      }
    }

    // Get value at leaf node and normalize to probabilities
    const value = this.tree.value[nodeIndex][0];
    const total = value.reduce((sum, v) => sum + v, 0);

    return value.map(v => v / total);
  }
}

/**
 * Random Forest Classifier inference
 */
export class RandomForestClassifier {
  private trees: DecisionTreeInference[];
  private scaler: StandardScaler;
  private classes: number[];
  private featureNames: string[];
  private nClasses: number;

  constructor(model: RandomForestModel) {
    this.trees = model.trees.map(tree => new DecisionTreeInference(tree));
    this.scaler = new StandardScaler(model.scaler);
    this.classes = model.classes;
    this.featureNames = model.feature_names;
    this.nClasses = model.n_classes;
  }

  /**
   * Get feature names expected by the model
   */
  getFeatureNames(): string[] {
    return this.featureNames;
  }

  /**
   * Predict class label for a single sample
   */
  predict(features: number[]): number {
    const proba = this.predictProba(features);
    const maxIndex = proba.indexOf(Math.max(...proba));
    return this.classes[maxIndex];
  }

  /**
   * Predict class probabilities for a single sample
   */
  predictProba(features: number[]): number[] {
    // Scale features
    const scaledFeatures = this.scaler.transform(features);

    // Aggregate predictions from all trees
    const aggregatedProba = new Array(this.nClasses).fill(0);

    for (const tree of this.trees) {
      const treeProba = tree.predictProba(scaledFeatures);
      for (let i = 0; i < this.nClasses; i++) {
        aggregatedProba[i] += treeProba[i];
      }
    }

    // Average probabilities
    const nTrees = this.trees.length;
    return aggregatedProba.map(p => p / nTrees);
  }

  /**
   * Predict with confidence score (max probability)
   */
  predictWithConfidence(features: number[]): { prediction: number; confidence: number; probabilities: number[] } {
    const proba = this.predictProba(features);
    const maxProba = Math.max(...proba);
    const maxIndex = proba.indexOf(maxProba);

    return {
      prediction: this.classes[maxIndex],
      confidence: maxProba,
      probabilities: proba,
    };
  }
}

/**
 * Hybrid scoring combining ML predictions with baseline rules
 */
export function hybridScore(
  mlScore: number,
  baselineScore: number,
  mlWeight: number = 0.6,
  baselineWeight: number = 0.4
): number {
  return mlScore * mlWeight + baselineScore * baselineWeight;
}

/**
 * Convert class probabilities to a score (0-100)
 */
export function probaToScore(probabilities: number[], classWeights?: number[]): number {
  const weights = classWeights || probabilities.map((_, i) => i * (100 / (probabilities.length - 1)));
  
  let score = 0;
  for (let i = 0; i < probabilities.length; i++) {
    score += probabilities[i] * weights[i];
  }
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate baseline deviation for a value from its baseline
 */
export function calculateDeviation(value: number, baseline: number, normalRange: [number, number]): number {
  const rangeWidth = normalRange[1] - normalRange[0];
  const deviation = (value - baseline) / (rangeWidth / 2);
  return Math.abs(deviation);
}
