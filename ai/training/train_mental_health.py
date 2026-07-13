"""
Mental Health Score Prediction Model Training

Uses Random Forest Classifier with:
- Standard Scaler normalization
- Risk level assessment
- Coping strategy recommendations

Output: models/mental_health_model.json
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib


# Feature columns
FEATURE_COLUMNS = [
    'current_mood', 'stress_level', 'anxiety_level', 'energy_level',
    'motivation_level', 'sleep_quality', 'sleep_hours', 'social_interaction',
    'exercise_frequency', 'meditation_practice', 'work_life_balance',
    'appetite_changes', 'concentration_issues', 'negative_thoughts',
    'recent_life_event',
    # Derived features
    'mood_energy_ratio', 'stress_anxiety_combined', 'wellbeing_index',
    'risk_factor_count'
]


def calculate_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate derived features for mental health prediction."""
    df = df.copy()
    
    # Mood to energy ratio (higher is better)
    df['mood_energy_ratio'] = df['current_mood'] / (6 - df['energy_level'] + 0.1)
    
    # Combined stress-anxiety score (lower is better)
    df['stress_anxiety_combined'] = (df['stress_level'] + df['anxiety_level']) / 2
    
    # Overall wellbeing index
    df['wellbeing_index'] = (
        df['current_mood'] + 
        df['energy_level'] + 
        df['motivation_level'] + 
        df['sleep_quality'] + 
        df['work_life_balance']
    ) / 5 - (
        df['stress_level'] + df['anxiety_level']
    ) / 4
    
    # Risk factor count
    df['risk_factor_count'] = (
        df['appetite_changes'] +
        df['concentration_issues'] +
        df['negative_thoughts'] +
        df['recent_life_event'] +
        (df['sleep_hours'] < 5).astype(int) +
        (df['social_interaction'] == 0).astype(int) +
        (df['stress_level'] >= 4).astype(int) +
        (df['anxiety_level'] >= 4).astype(int)
    )
    
    return df


def calculate_baseline_mental_score(row: pd.Series) -> float:
    """Calculate baseline mental health score using rules."""
    score = 100.0
    
    # Mood impact (high weight)
    mood = row['current_mood']
    score -= (5 - mood) * 10
    
    # Stress and anxiety (high negative impact)
    stress = row['stress_level']
    anxiety = row['anxiety_level']
    score -= (stress - 1) * 6
    score -= (anxiety - 1) * 6
    
    # Energy and motivation (positive factors)
    energy = row['energy_level']
    motivation = row['motivation_level']
    score += (energy - 3) * 3
    score += (motivation - 3) * 3
    
    # Sleep quality
    sleep_quality = row['sleep_quality']
    sleep_hours = row['sleep_hours']
    score += (sleep_quality - 3) * 4
    if sleep_hours < 5:
        score -= 10
    elif sleep_hours < 6:
        score -= 5
    
    # Social connection
    social = row['social_interaction']
    if social == 0:  # Isolated
        score -= 12
    elif social == 1:  # Minimal
        score -= 5
    elif social == 3:  # Active
        score += 5
    
    # Healthy habits bonuses
    if row['exercise_frequency'] >= 2:
        score += 5
    if row['meditation_practice'] == 1:
        score += 5
    
    # Risk factors penalties
    if row['appetite_changes'] == 1:
        score -= 5
    if row['concentration_issues'] == 1:
        score -= 5
    if row['negative_thoughts'] == 1:
        score -= 8
    if row['recent_life_event'] == 1:
        score -= 5
    
    # Work-life balance
    wlb = row['work_life_balance']
    score += (wlb - 3) * 4
    
    return max(0, min(100, score))


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
        'trees': trees_data,
        'scaler': {
            'mean': scaler.mean_.tolist(),
            'scale': scaler.scale_.tolist()
        },
        'category_labels': ['Crisis', 'Struggling', 'Coping', 'Healthy', 'Thriving'],
        'risk_thresholds': {
            'severe': 20,
            'high': 40,
            'moderate': 60,
            'low': 80
        },
        'hybrid_weights': {
            'ml_weight': 0.6,
            'baseline_weight': 0.4
        },
        'coping_strategies': {
            'Crisis': [
                'Please reach out to a mental health professional immediately',
                'Contact a crisis helpline: 988 (Suicide & Crisis Lifeline)',
                'Talk to someone you trust right now',
                'Focus on basic needs: eat, hydrate, rest'
            ],
            'Struggling': [
                'Consider scheduling an appointment with a therapist',
                'Practice deep breathing exercises daily',
                'Reach out to supportive friends or family',
                'Limit stressors where possible'
            ],
            'Coping': [
                'Continue your current self-care routine',
                'Add 10 minutes of mindfulness practice daily',
                'Monitor your stress triggers',
                'Maintain social connections'
            ],
            'Healthy': [
                'Keep up your positive habits',
                'Consider helping others who may be struggling',
                'Try new wellness activities',
                'Build resilience for challenging times'
            ],
            'Thriving': [
                'Share your strategies with others',
                'Set new personal growth goals',
                'Mentor others in wellness',
                'Maintain your excellent self-care routine'
            ]
        }
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(model_json, f, indent=2)
    
    print(f"Model exported to {output_path}")


def train_model(data_path: str, output_dir: str):
    """Train the mental health prediction model."""
    
    print("Loading dataset...")
    df = pd.read_csv(data_path)
    print(f"Dataset shape: {df.shape}")
    
    # Calculate derived features
    print("Calculating derived features...")
    df = calculate_derived_features(df)
    
    # Calculate baseline scores
    print("Calculating baseline scores...")
    df['baseline_score'] = df.apply(calculate_baseline_mental_score, axis=1)
    
    # Prepare features and target
    X = df[FEATURE_COLUMNS]
    y = df['mental_health_category']
    
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
        n_estimators=100,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced'  # Handle class imbalance for crisis cases
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    print("\nEvaluating model...")
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)
    
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=['Crisis', 'Struggling', 'Coping', 'Healthy', 'Thriving']))
    
    # Cross-validation
    print("Performing cross-validation...")
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
    
    # Export model
    output_path = os.path.join(output_dir, 'mental_health_model.json')
    export_model_to_json(model, scaler, FEATURE_COLUMNS, output_path)
    
    # Also save sklearn model for reference
    joblib.dump(model, os.path.join(output_dir, 'mental_health_model.joblib'))
    joblib.dump(scaler, os.path.join(output_dir, 'mental_health_scaler.joblib'))
    
    print("\nTraining complete!")
    return model, scaler


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Mental Health Prediction Model')
    parser.add_argument('--data', type=str, default='data/mental_health_data.csv',
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
