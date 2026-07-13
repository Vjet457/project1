"""
Physical Health Score Prediction Model Training

Uses Random Forest Classifier with:
- Standard Scaler normalization
- Baseline deviation calculation
- Hybrid scoring formula

Output: models/physical_health_model.json
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


# Standard baseline values for deviation calculation
BASELINE_VALUES = {
    'heart_rate': 72,
    'bp_systolic': 120,
    'bp_diastolic': 80,
    'blood_oxygen': 98,
    'body_temperature': 98.6,
    'respiratory_rate': 14,
    'daily_steps': 8000,
    'active_minutes': 45,
    'sleep_hours': 7.5,
    'sleep_quality': 4,
    'bmi': 22,
    'water_intake': 2.5
}

# Feature columns
FEATURE_COLUMNS = [
    'heart_rate', 'bp_systolic', 'bp_diastolic', 'blood_oxygen',
    'body_temperature', 'respiratory_rate', 'daily_steps', 'active_minutes',
    'sleep_hours', 'sleep_quality', 'bmi', 'water_intake',
    'age', 'gender', 'smoking', 'alcohol',
    # Deviation features
    'hr_deviation', 'bp_sys_deviation', 'bp_dia_deviation',
    'oxygen_deviation', 'temp_deviation', 'steps_deviation',
    'sleep_deviation', 'bmi_deviation'
]


def calculate_deviations(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate deviation from baseline values."""
    df = df.copy()
    
    df['hr_deviation'] = np.abs(df['heart_rate'] - BASELINE_VALUES['heart_rate'])
    df['bp_sys_deviation'] = np.abs(df['bp_systolic'] - BASELINE_VALUES['bp_systolic'])
    df['bp_dia_deviation'] = np.abs(df['bp_diastolic'] - BASELINE_VALUES['bp_diastolic'])
    df['oxygen_deviation'] = np.abs(df['blood_oxygen'] - BASELINE_VALUES['blood_oxygen'])
    df['temp_deviation'] = np.abs(df['body_temperature'] - BASELINE_VALUES['body_temperature'])
    df['steps_deviation'] = np.abs(df['daily_steps'] - BASELINE_VALUES['daily_steps']) / 1000  # Scale
    df['sleep_deviation'] = np.abs(df['sleep_hours'] - BASELINE_VALUES['sleep_hours'])
    df['bmi_deviation'] = np.abs(df['bmi'] - BASELINE_VALUES['bmi'])
    
    return df


def calculate_baseline_score(row: pd.Series) -> float:
    """Calculate baseline score using rule-based approach."""
    score = 100.0
    
    # Heart rate penalties
    hr = row['heart_rate']
    if hr < 60 or hr > 100:
        score -= min(15, abs(hr - 80) * 0.5)
    
    # Blood pressure penalties
    bp_sys = row['bp_systolic']
    bp_dia = row['bp_diastolic']
    if bp_sys > 140 or bp_sys < 90:
        score -= min(15, abs(bp_sys - 120) * 0.3)
    if bp_dia > 90 or bp_dia < 60:
        score -= min(10, abs(bp_dia - 80) * 0.3)
    
    # Blood oxygen penalties
    oxygen = row['blood_oxygen']
    if oxygen < 95:
        score -= (95 - oxygen) * 3
    
    # Temperature penalties
    temp = row['body_temperature']
    if temp > 99.5 or temp < 97:
        score -= min(10, abs(temp - 98.6) * 5)
    
    # BMI penalties
    bmi = row['bmi']
    if bmi < 18.5 or bmi > 25:
        score -= min(10, abs(bmi - 22) * 1.5)
    
    # Activity bonuses/penalties
    steps = row['daily_steps']
    if steps >= 10000:
        score += 5
    elif steps < 5000:
        score -= 5
    
    # Sleep quality
    sleep = row['sleep_hours']
    if 7 <= sleep <= 9:
        score += 3
    elif sleep < 5 or sleep > 10:
        score -= 5
    
    # Smoking/Alcohol penalties
    if row['smoking'] == 2:  # Current smoker
        score -= 10
    elif row['smoking'] == 1:  # Former smoker
        score -= 3
    
    if row['alcohol'] == 3:  # Heavy
        score -= 8
    elif row['alcohol'] == 2:  # Moderate
        score -= 3
    
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
        'baseline_values': BASELINE_VALUES,
        'category_labels': ['Poor', 'Fair', 'Good', 'Excellent'],
        'hybrid_weights': {
            'ml_weight': 0.6,
            'baseline_weight': 0.4
        }
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(model_json, f, indent=2)
    
    print(f"Model exported to {output_path}")


def train_model(data_path: str, output_dir: str):
    """Train the physical health prediction model."""
    
    print("Loading dataset...")
    df = pd.read_csv(data_path)
    print(f"Dataset shape: {df.shape}")
    
    # Calculate deviations
    print("Calculating baseline deviations...")
    df = calculate_deviations(df)
    
    # Calculate baseline scores for hybrid approach
    print("Calculating baseline scores...")
    df['baseline_score'] = df.apply(calculate_baseline_score, axis=1)
    
    # Prepare features and target
    X = df[FEATURE_COLUMNS]
    y = df['health_category']
    
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
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
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
          target_names=['Poor', 'Fair', 'Good', 'Excellent']))
    
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
    output_path = os.path.join(output_dir, 'physical_health_model.json')
    export_model_to_json(model, scaler, FEATURE_COLUMNS, output_path)
    
    # Also save sklearn model for reference
    joblib.dump(model, os.path.join(output_dir, 'physical_health_model.joblib'))
    joblib.dump(scaler, os.path.join(output_dir, 'physical_health_scaler.joblib'))
    
    print("\nTraining complete!")
    return model, scaler


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Physical Health Prediction Model')
    parser.add_argument('--data', type=str, default='data/physical_health_data.csv',
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
