# AI Health Prediction Module

This module provides ML-based health predictions for the AarogyaSaathi health app.
It includes Python training scripts and TypeScript inference modules for React Native.

## Quick Start

```bash

cd ai
pip install -r requirements.txt


python train_all.py --samples 10000




## Algorithms Used

### 1. Random Forest Classifier
- Ensemble learning method using multiple decision trees
- Provides robust predictions with built-in feature importance
- Handles non-linear relationships in health data
- Configuration: 100-120 estimators, max_depth 12-15

### 2. Standard Scaler
- Normalizes features to zero mean and unit variance
- Ensures consistent feature scaling across different metrics
- Formula: z = (x - μ) / σ

### 3. Baseline Deviation Algorithm
- Calculates how far metrics deviate from healthy baselines
- Personalizes scoring based on individual variations
- Considers age and gender-adjusted normal ranges
- Example baselines: HR=72bpm, BP=120/80, SpO2=98%

### 4. Hybrid Scoring Formula
- Combines ML predictions with rule-based baseline scores
- Formula: **Final Score = (0.6 × ML Score) + (0.4 × Baseline Score)**
- Provides robustness when ML confidence is low
- Configurable weights per model

### 5. Symptom Severity Classification
- Multi-class classification (Mild, Moderate, Severe)
- Weighted symptom analysis with critical symptom detection
- Urgency level prediction (Low, Medium, High, Emergency)
- Emergency indicators: chest pain, confusion, breathing difficulty

## Directory Structure

```
ai/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── train_all.py           # Train all models at once
├── training/
│   ├── generate_dataset.py    # Synthetic data generation
│   ├── train_physical_health.py
│   ├── train_mental_health.py
│   └── train_symptom_severity.py
├── models/                # Trained models (JSON format)
│   ├── physical_health_model.json
│   ├── mental_health_model.json
│   └── symptom_severity_model.json
└── data/                  # Training datasets
    ├── physical_health_data.csv
    ├── mental_health_data.csv
    └── symptom_data.csv

src/ml/                    # TypeScript inference modules
├── index.ts               # Main exports & MLModelManager
├── RandomForestInference.ts   # Core RF implementation
├── PhysicalHealthModel.ts
├── MentalHealthModel.ts
└── SymptomSeverityModel.ts

src/services/
└── mlHealthBridge.ts      # Bridge to existing aiHealthService
```

## Detailed Setup

### 1. Create Python Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Train Models (Easy Way)

```bash
# Train all models with default 10,000 samples
python train_all.py

# Or with custom sample count
python train_all.py --samples 50000

# Skip data generation if data already exists
python train_all.py --skip-generation
```

### 4. Train Models (Individual)

```bash
cd training

# Generate datasets first
python generate_dataset.py --samples 10000

# Train each model
python train_physical_health.py --data ../data/physical_health_data.csv --output ../models
python train_mental_health.py --data ../data/mental_health_data.csv --output ../models
python train_symptom_severity.py --data ../data/symptom_data.csv --output ../models
```

## Model Export Format

Models are exported to JSON format for mobile inference. Each JSON file contains:

```json
{
  "model_type": "RandomForestClassifier",
  "n_estimators": 100,
  "n_classes": 4,
  "classes": [0, 1, 2, 3],
  "feature_names": ["heart_rate", "bp_systolic", ...],
  "trees": [...],
  "scaler": {
    "mean": [...],
    "scale": [...]
  },
  "hybrid_weights": {
    "ml_weight": 0.6,
    "baseline_weight": 0.4
  }
}
```

## Using in React Native

### Import the ML Module

```typescript
import {
  getMLModelManager,
  initializeMLModels,
  PhysicalHealthInput,
  MentalHealthInput,
  SymptomInput,
} from './src/ml';

// Or use the bridge for compatibility with existing code
import {
  getMLPhysicalHealthScore,
  getMLMentalHealthScore,
  getMLSymptomSeverity,
  getMLOverallHealth,
} from './src/services/mlHealthBridge';
```

### Example: Physical Health Prediction

```typescript
const manager = getMLModelManager();

const result = manager.predictPhysicalHealth({
  heartRate: 72,
  bpSystolic: 120,
  bpDiastolic: 80,
  bloodOxygen: 98,
  bodyTemperature: 98.6,
  respiratoryRate: 14,
  dailySteps: 8000,
  activeMinutes: 45,
  sleepHours: 7.5,
  sleepQuality: 4,
  bmi: 22,
  waterIntake: 8,
  age: 30,
  gender: 'male',
  smoking: false,
  alcohol: false,
});

console.log(result.score);       // 0-100
console.log(result.category);    // 'Excellent' | 'Good' | 'Fair' | 'Poor'
console.log(result.recommendations);
```

### Example: Mental Health Prediction

```typescript
const result = manager.predictMentalHealth({
  currentMood: 4,
  stressLevel: 2,
  anxietyLevel: 2,
  energyLevel: 4,
  motivationLevel: 4,
  sleepQuality: 4,
  sleepHours: 7,
  socialInteraction: 2,
  exerciseFrequency: 3,
  meditationPractice: true,
  workLifeBalance: 4,
  appetiteChanges: false,
  concentrationIssues: false,
  negativeThoughts: false,
  recentLifeEvent: false,
});

console.log(result.score);         // 0-100
console.log(result.category);      // 'Thriving' | 'Healthy' | 'Coping' | 'Struggling' | 'Crisis'
console.log(result.riskLevel);     // 'Low' | 'Moderate' | 'High' | 'Severe'
console.log(result.copingStrategies);
```

### Example: Symptom Severity

```typescript
const result = manager.predictSymptomSeverity({
  symptoms: {
    fever: true,
    headache: true,
    fatigue: true,
    cough: true,
  },
  durationDays: 3,
  intensity: 3,
  age: 30,
  hasComorbidities: false,
});

console.log(result.severity);      // 'Mild' | 'Moderate' | 'Severe'
console.log(result.urgency);       // 'Low' | 'Medium' | 'High' | 'Emergency'
console.log(result.action);        // Recommended action
console.log(result.recommendations);
```

## Model Performance

Expected accuracy after training on 10,000+ samples:

| Model | Accuracy | CV Score |
|-------|----------|----------|
| Physical Health | ~85% | 0.83-0.87 |
| Mental Health | ~82% | 0.80-0.84 |
| Symptom Severity | ~88% | 0.86-0.90 |

