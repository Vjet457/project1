"""
Symptom Severity Classification Model Training

Uses Random Forest Classifier with:
- Standard Scaler normalization
- Multi-symptom analysis
- Urgency level prediction

Output: models/symptom_severity_model.json
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib


# Symptom feature columns
SYMPTOM_COLUMNS = [
    'has_fever', 'has_headache', 'has_cough', 'has_fatigue', 'has_body_ache',
    'has_nausea', 'has_diarrhea', 'has_vomiting', 'has_shortness_of_breath',
    'has_chest_pain', 'has_dizziness', 'has_sore_throat', 'has_runny_nose',
    'has_loss_of_taste_smell', 'has_abdominal_pain', 'has_rash',
    'has_joint_pain', 'has_confusion'
]

FEATURE_COLUMNS = SYMPTOM_COLUMNS + [
    'symptom_count', 'symptom_duration_days', 'symptom_intensity',
    'age', 'has_comorbidities',
    # Derived features
    'critical_symptoms', 'respiratory_symptoms', 'gi_symptoms',
    'neurological_symptoms', 'severity_index'
]

# Critical symptoms that indicate potential emergency
CRITICAL_SYMPTOMS = ['has_chest_pain', 'has_shortness_of_breath', 'has_confusion']

# Symptom weights for severity calculation
SYMPTOM_WEIGHTS = {
    'has_chest_pain': 3.0,
    'has_shortness_of_breath': 2.5,
    'has_confusion': 2.5,
    'has_fever': 1.2,
    'has_vomiting': 1.3,
    'has_dizziness': 1.4,
    'has_loss_of_taste_smell': 1.2,
    'has_headache': 1.0,
    'has_cough': 1.0,
    'has_fatigue': 0.8,
    'has_body_ache': 0.8,
    'has_nausea': 0.9,
    'has_diarrhea': 0.9,
    'has_sore_throat': 0.7,
    'has_runny_nose': 0.6,
    'has_abdominal_pain': 1.1,
    'has_rash': 0.8,
    'has_joint_pain': 0.8
}


def calculate_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate derived features for symptom analysis."""
    df = df.copy()
    
    # Critical symptoms count
    df['critical_symptoms'] = (
        df['has_chest_pain'] +
        df['has_shortness_of_breath'] +
        df['has_confusion']
    )
    
    # Respiratory symptoms
    df['respiratory_symptoms'] = (
        df['has_cough'] +
        df['has_shortness_of_breath'] +
        df['has_sore_throat'] +
        df['has_runny_nose']
    )
    
    # GI symptoms
    df['gi_symptoms'] = (
        df['has_nausea'] +
        df['has_diarrhea'] +
        df['has_vomiting'] +
        df['has_abdominal_pain']
    )
    
    # Neurological symptoms
    df['neurological_symptoms'] = (
        df['has_headache'] +
        df['has_dizziness'] +
        df['has_confusion']
    )
    
    # Calculate weighted severity index
    severity_index = np.zeros(len(df))
    for symptom, weight in SYMPTOM_WEIGHTS.items():
        if symptom in df.columns:
            severity_index += df[symptom].values * weight
    
    # Add intensity and duration factors
    severity_index *= (1 + df['symptom_intensity'].values / 5)
    severity_index *= np.log1p(df['symptom_duration_days'].values)
    
    # Age factor (higher risk for elderly)
    age_factor = np.where(df['age'] >= 65, 1.3, np.where(df['age'] < 18, 1.1, 1.0))
    severity_index *= age_factor
    
    # Comorbidities factor
    severity_index *= np.where(df['has_comorbidities'] == 1, 1.4, 1.0)
    
    df['severity_index'] = severity_index
    
    return df


def calculate_baseline_severity(row: pd.Series) -> int:
    """Calculate rule-based severity level."""
    # Start with symptom count
    score = row['symptom_count'] * 0.5
    
    # Critical symptoms override
    if row['has_chest_pain'] == 1 or row['has_confusion'] == 1:
        return 2  # Severe
    
    if row['has_shortness_of_breath'] == 1 and row['symptom_intensity'] >= 4:
        return 2  # Severe
    
    # Intensity factor
    score += row['symptom_intensity'] * 0.8
    
    # Duration factor
    duration = row['symptom_duration_days']
    if duration >= 7:
        score += 2
    elif duration >= 3:
        score += 1
    
    # Age factor
    age = row['age']
    if age >= 70:
        score += 1.5
    elif age >= 60:
        score += 1
    elif age < 5:
        score += 1.5
    
    # Comorbidities
    if row['has_comorbidities'] == 1:
        score += 1.5
    
    # Weight critical symptoms
    score += row['has_chest_pain'] * 3
    score += row['has_shortness_of_breath'] * 2
    score += row['has_confusion'] * 2
    score += row['has_vomiting'] * 0.5
    score += row['has_fever'] * 0.5
    
    # Categorize
    if score >= 8:
        return 2  # Severe
    elif score >= 4:
        return 1  # Moderate
    else:
        return 0  # Mild


def export_model_to_json(model: RandomForestClassifier, scaler: StandardScaler,
                         feature_names: list, output_path: str):
    """Export Random Forest model to JSON for mobile inference."""
    
    # Extract decision trees
    trees_data = []
    for tree in model.estimators_:
        tree_data = {
            'n_nodes': tree.tree_.node_count,
            'children_left': tree.tree_.children_left.tolist(),
            'children_right': tree.tree_.children_right.tolist(),
            'feature': tree.tree_.feature.tolist(),
            'threshold': tree.tree_.threshold.tolist(),
            'value': tree.tree_.value.tolist()
        }
        trees_data.append(tree_data)
    
    # Export model structure
    model_json = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': model.n_estimators,
        'n_classes': model.n_classes_,
        'classes': model.classes_.tolist(),
        'feature_names': feature_names,
        'symptom_columns': SYMPTOM_COLUMNS,
        'trees': trees_data,
        'scaler': {
            'mean': scaler.mean_.tolist(),
            'scale': scaler.scale_.tolist()
        },
        'severity_labels': ['Mild', 'Moderate', 'Severe'],
        'critical_symptoms': CRITICAL_SYMPTOMS,
        'symptom_weights': SYMPTOM_WEIGHTS,
        'hybrid_weights': {
            'ml_weight': 0.6,
            'baseline_weight': 0.4
        },
        'recommendations': {
            'Mild': {
                'urgency': 'Low',
                'action': 'Monitor symptoms at home',
                'tips': [
                    'Rest and stay hydrated',
                    'Take over-the-counter medications as needed',
                    'Monitor for worsening symptoms',
                    'See a doctor if symptoms persist beyond 5-7 days'
                ]
            },
            'Moderate': {
                'urgency': 'Medium',
                'action': 'Schedule a doctor appointment',
                'tips': [
                    'Contact your primary care physician',
                    'Keep track of all symptoms and their progression',
                    'Avoid strenuous activities',
                    'Seek urgent care if symptoms worsen rapidly'
                ]
            },
            'Severe': {
                'urgency': 'High',
                'action': 'Seek immediate medical attention',
                'tips': [
                    'Go to the emergency room or call emergency services',
                    'Do not drive yourself if experiencing chest pain or confusion',
                    'Inform medical staff of all symptoms',
                    'Bring a list of current medications'
                ]
            }
        },
        'emergency_indicators': [
            'Severe chest pain',
            'Difficulty breathing',
            'Confusion or altered consciousness',
            'Inability to keep fluids down',
            'High fever that does not respond to medication',
            'Severe abdominal pain',
            'Signs of dehydration'
        ]
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(model_json, f, indent=2)
    
    print(f"Model exported to {output_path}")


def train_model(data_path: str, output_dir: str):
    """Train the symptom severity classification model."""
    
    print("Loading dataset...")
    df = pd.read_csv(data_path)
    print(f"Dataset shape: {df.shape}")
    
    # Add comorbidities column if not present (randomize for training)
    if 'has_comorbidities' not in df.columns:
        np.random.seed(42)
        df['has_comorbidities'] = (np.random.random(len(df)) > 0.7).astype(int)
    
    # Calculate derived features
    print("Calculating derived features...")
    df = calculate_derived_features(df)
    
    # Calculate baseline severity for comparison
    df['baseline_severity'] = df.apply(calculate_baseline_severity, axis=1)
    
    # Prepare features and target
    X = df[FEATURE_COLUMNS]
    y = df['severity']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Normalize features
    print("Normalizing features with StandardScaler...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=15,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        class_weight={0: 1.0, 1: 1.5, 2: 2.0}  # Weight severe cases higher
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    print("\nEvaluating model...")
    y_pred = model.predict(X_test_scaled)
    
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=['Mild', 'Moderate', 'Severe']))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Cross-validation
    print("\nPerforming cross-validation...")
    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
    print(f"CV Scores: {cv_scores}")
    print(f"Mean CV Score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Feature importance
    print("\nTop 10 Feature Importances:")
    importances = pd.DataFrame({
        'feature': FEATURE_COLUMNS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importances.head(10))
    
    # Analyze baseline vs ML performance
    baseline_accuracy = accuracy_score(y_test, df.loc[y_test.index, 'baseline_severity'])
    print(f"\nBaseline Rule-Based Accuracy: {baseline_accuracy:.4f}")
    print(f"ML Model Improvement: {(accuracy - baseline_accuracy) * 100:.2f}%")
    
    # Export model
    output_path = os.path.join(output_dir, 'symptom_severity_model.json')
    export_model_to_json(model, scaler, FEATURE_COLUMNS, output_path)
    
    # Also save sklearn model for reference
    joblib.dump(model, os.path.join(output_dir, 'symptom_severity_model.joblib'))
    joblib.dump(scaler, os.path.join(output_dir, 'symptom_severity_scaler.joblib'))
    
    print("\nTraining complete!")
    return model, scaler


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Symptom Severity Classification Model')
    parser.add_argument('--data', type=str, default='data/symptom_data.csv',
                        help='Path to training data CSV')
    parser.add_argument('--output', type=str, default='models',
                        help='Output directory for model files')
    args = parser.parse_args()
    
    # Check if data exists
    if not os.path.exists(args.data):
        print(f"Data file not found: {args.data}")
        print("Run generate_dataset.py first to create training data.")
        return
    
    train_model(args.data, args.output)


if __name__ == '__main__':
    main()
