"""
Dataset Generator for AarogyaSaathi Health Prediction Models

Generates synthetic but realistic health data for training:
- Physical Health Dataset
- Mental Health Dataset
- Symptom Severity Dataset

Usage:
    python generate_dataset.py --samples 10000
"""

import numpy as np
import pandas as pd
import argparse
import os
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)


def generate_physical_health_data(n_samples: int) -> pd.DataFrame:
    """
    Generate synthetic physical health data.
    
    Features:
    - heart_rate: 50-120 bpm
    - bp_systolic: 90-180 mmHg
    - bp_diastolic: 60-120 mmHg
    - blood_oxygen: 88-100 %
    - body_temperature: 96-104 °F
    - respiratory_rate: 10-30 breaths/min
    - daily_steps: 0-25000
    - active_minutes: 0-180
    - sleep_hours: 3-12
    - sleep_quality: 1-5
    - bmi: 15-45
    - water_intake: 0-5 liters
    - age: 18-85
    - gender: 0 (female), 1 (male)
    - smoking: 0 (never), 1 (former), 2 (current)
    - alcohol: 0 (none), 1 (occasional), 2 (moderate), 3 (heavy)
    
    Target: health_category (0: Poor, 1: Fair, 2: Good, 3: Excellent)
    """
    
    data = []
    
    for _ in range(n_samples):
        # Generate base health profile
        age = np.random.randint(18, 86)
        gender = np.random.choice([0, 1])
        
        # Health status determines other features
        health_status = np.random.choice([0, 1, 2, 3], p=[0.15, 0.30, 0.35, 0.20])
        
        # Generate correlated features based on health status
        if health_status == 3:  # Excellent
            heart_rate = np.random.normal(68, 8)
            bp_systolic = np.random.normal(115, 8)
            bp_diastolic = np.random.normal(75, 6)
            blood_oxygen = np.random.normal(98.5, 0.8)
            body_temp = np.random.normal(98.4, 0.4)
            respiratory_rate = np.random.normal(14, 2)
            daily_steps = np.random.normal(12000, 3000)
            active_minutes = np.random.normal(90, 25)
            sleep_hours = np.random.normal(7.5, 0.8)
            sleep_quality = np.random.choice([4, 5], p=[0.4, 0.6])
            bmi = np.random.normal(22, 2)
            water_intake = np.random.normal(3, 0.6)
            smoking = 0
            alcohol = np.random.choice([0, 1], p=[0.6, 0.4])
            
        elif health_status == 2:  # Good
            heart_rate = np.random.normal(72, 10)
            bp_systolic = np.random.normal(122, 10)
            bp_diastolic = np.random.normal(80, 7)
            blood_oxygen = np.random.normal(97.5, 1.0)
            body_temp = np.random.normal(98.5, 0.5)
            respiratory_rate = np.random.normal(15, 2.5)
            daily_steps = np.random.normal(8000, 2500)
            active_minutes = np.random.normal(55, 20)
            sleep_hours = np.random.normal(7, 1)
            sleep_quality = np.random.choice([3, 4, 5], p=[0.3, 0.5, 0.2])
            bmi = np.random.normal(24, 2.5)
            water_intake = np.random.normal(2.5, 0.7)
            smoking = np.random.choice([0, 1], p=[0.8, 0.2])
            alcohol = np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
            
        elif health_status == 1:  # Fair
            heart_rate = np.random.normal(80, 12)
            bp_systolic = np.random.normal(135, 15)
            bp_diastolic = np.random.normal(88, 10)
            blood_oxygen = np.random.normal(96, 1.5)
            body_temp = np.random.normal(98.8, 0.7)
            respiratory_rate = np.random.normal(17, 3)
            daily_steps = np.random.normal(5000, 2000)
            active_minutes = np.random.normal(30, 15)
            sleep_hours = np.random.normal(6, 1.2)
            sleep_quality = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2])
            bmi = np.random.normal(27, 3)
            water_intake = np.random.normal(1.8, 0.6)
            smoking = np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2])
            alcohol = np.random.choice([0, 1, 2, 3], p=[0.2, 0.3, 0.35, 0.15])
            
        else:  # Poor
            heart_rate = np.random.normal(92, 15)
            bp_systolic = np.random.normal(150, 20)
            bp_diastolic = np.random.normal(95, 12)
            blood_oxygen = np.random.normal(94, 2)
            body_temp = np.random.normal(99.2, 1)
            respiratory_rate = np.random.normal(20, 4)
            daily_steps = np.random.normal(2000, 1500)
            active_minutes = np.random.normal(10, 10)
            sleep_hours = np.random.normal(5, 1.5)
            sleep_quality = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
            bmi = np.random.normal(32, 5)
            water_intake = np.random.normal(1.2, 0.5)
            smoking = np.random.choice([0, 1, 2], p=[0.3, 0.3, 0.4])
            alcohol = np.random.choice([0, 1, 2, 3], p=[0.1, 0.2, 0.3, 0.4])
        
        # Clip values to realistic ranges
        record = {
            'heart_rate': np.clip(heart_rate, 50, 120),
            'bp_systolic': np.clip(bp_systolic, 90, 180),
            'bp_diastolic': np.clip(bp_diastolic, 60, 120),
            'blood_oxygen': np.clip(blood_oxygen, 88, 100),
            'body_temperature': np.clip(body_temp, 96, 104),
            'respiratory_rate': np.clip(respiratory_rate, 10, 30),
            'daily_steps': np.clip(daily_steps, 0, 25000),
            'active_minutes': np.clip(active_minutes, 0, 180),
            'sleep_hours': np.clip(sleep_hours, 3, 12),
            'sleep_quality': int(np.clip(sleep_quality, 1, 5)),
            'bmi': np.clip(bmi, 15, 45),
            'water_intake': np.clip(water_intake, 0, 5),
            'age': age,
            'gender': gender,
            'smoking': smoking,
            'alcohol': alcohol,
            'health_category': health_status
        }
        
        data.append(record)
    
    return pd.DataFrame(data)


def generate_mental_health_data(n_samples: int) -> pd.DataFrame:
    """
    Generate synthetic mental health data.
    
    Features:
    - current_mood: 1-5
    - stress_level: 1-5
    - anxiety_level: 1-5
    - energy_level: 1-5
    - motivation_level: 1-5
    - sleep_quality: 1-5
    - sleep_hours: 3-12
    - social_interaction: 0 (isolated), 1 (minimal), 2 (moderate), 3 (active)
    - exercise_frequency: 0 (none), 1 (rarely), 2 (weekly), 3 (daily)
    - meditation_practice: 0, 1
    - work_life_balance: 1-5
    - appetite_changes: 0, 1
    - concentration_issues: 0, 1
    - negative_thoughts: 0, 1
    - recent_life_event: 0, 1
    
    Target: mental_health_category (0: Crisis, 1: Struggling, 2: Coping, 3: Healthy, 4: Thriving)
    """
    
    data = []
    
    for _ in range(n_samples):
        # Mental health status
        mental_status = np.random.choice([0, 1, 2, 3, 4], p=[0.05, 0.15, 0.30, 0.35, 0.15])
        
        if mental_status == 4:  # Thriving
            current_mood = np.random.choice([4, 5], p=[0.3, 0.7])
            stress_level = np.random.choice([1, 2], p=[0.6, 0.4])
            anxiety_level = np.random.choice([1, 2], p=[0.7, 0.3])
            energy_level = np.random.choice([4, 5], p=[0.4, 0.6])
            motivation_level = np.random.choice([4, 5], p=[0.3, 0.7])
            sleep_quality = np.random.choice([4, 5], p=[0.4, 0.6])
            sleep_hours = np.random.normal(7.5, 0.6)
            social_interaction = np.random.choice([2, 3], p=[0.3, 0.7])
            exercise_frequency = np.random.choice([2, 3], p=[0.4, 0.6])
            meditation_practice = np.random.choice([0, 1], p=[0.3, 0.7])
            work_life_balance = np.random.choice([4, 5], p=[0.4, 0.6])
            appetite_changes = 0
            concentration_issues = 0
            negative_thoughts = 0
            recent_life_event = np.random.choice([0, 1], p=[0.8, 0.2])
            
        elif mental_status == 3:  # Healthy
            current_mood = np.random.choice([3, 4, 5], p=[0.2, 0.5, 0.3])
            stress_level = np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2])
            anxiety_level = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
            energy_level = np.random.choice([3, 4, 5], p=[0.3, 0.5, 0.2])
            motivation_level = np.random.choice([3, 4, 5], p=[0.3, 0.5, 0.2])
            sleep_quality = np.random.choice([3, 4, 5], p=[0.3, 0.5, 0.2])
            sleep_hours = np.random.normal(7, 0.8)
            social_interaction = np.random.choice([1, 2, 3], p=[0.2, 0.5, 0.3])
            exercise_frequency = np.random.choice([1, 2, 3], p=[0.3, 0.4, 0.3])
            meditation_practice = np.random.choice([0, 1], p=[0.5, 0.5])
            work_life_balance = np.random.choice([3, 4, 5], p=[0.3, 0.5, 0.2])
            appetite_changes = np.random.choice([0, 1], p=[0.9, 0.1])
            concentration_issues = np.random.choice([0, 1], p=[0.85, 0.15])
            negative_thoughts = np.random.choice([0, 1], p=[0.85, 0.15])
            recent_life_event = np.random.choice([0, 1], p=[0.7, 0.3])
            
        elif mental_status == 2:  # Coping
            current_mood = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2])
            stress_level = np.random.choice([2, 3, 4], p=[0.3, 0.4, 0.3])
            anxiety_level = np.random.choice([2, 3, 4], p=[0.3, 0.4, 0.3])
            energy_level = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2])
            motivation_level = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2])
            sleep_quality = np.random.choice([2, 3, 4], p=[0.4, 0.4, 0.2])
            sleep_hours = np.random.normal(6.5, 1)
            social_interaction = np.random.choice([0, 1, 2, 3], p=[0.1, 0.3, 0.4, 0.2])
            exercise_frequency = np.random.choice([0, 1, 2], p=[0.3, 0.4, 0.3])
            meditation_practice = np.random.choice([0, 1], p=[0.6, 0.4])
            work_life_balance = np.random.choice([2, 3, 4], p=[0.4, 0.4, 0.2])
            appetite_changes = np.random.choice([0, 1], p=[0.7, 0.3])
            concentration_issues = np.random.choice([0, 1], p=[0.6, 0.4])
            negative_thoughts = np.random.choice([0, 1], p=[0.6, 0.4])
            recent_life_event = np.random.choice([0, 1], p=[0.5, 0.5])
            
        elif mental_status == 1:  # Struggling
            current_mood = np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2])
            stress_level = np.random.choice([3, 4, 5], p=[0.3, 0.4, 0.3])
            anxiety_level = np.random.choice([3, 4, 5], p=[0.3, 0.4, 0.3])
            energy_level = np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2])
            motivation_level = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
            sleep_quality = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
            sleep_hours = np.random.normal(5.5, 1.5)
            social_interaction = np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
            exercise_frequency = np.random.choice([0, 1], p=[0.6, 0.4])
            meditation_practice = np.random.choice([0, 1], p=[0.8, 0.2])
            work_life_balance = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
            appetite_changes = np.random.choice([0, 1], p=[0.4, 0.6])
            concentration_issues = np.random.choice([0, 1], p=[0.3, 0.7])
            negative_thoughts = np.random.choice([0, 1], p=[0.3, 0.7])
            recent_life_event = np.random.choice([0, 1], p=[0.3, 0.7])
            
        else:  # Crisis
            current_mood = np.random.choice([1, 2], p=[0.7, 0.3])
            stress_level = np.random.choice([4, 5], p=[0.3, 0.7])
            anxiety_level = np.random.choice([4, 5], p=[0.3, 0.7])
            energy_level = np.random.choice([1, 2], p=[0.6, 0.4])
            motivation_level = np.random.choice([1, 2], p=[0.7, 0.3])
            sleep_quality = np.random.choice([1, 2], p=[0.6, 0.4])
            sleep_hours = np.random.normal(4, 1.5)
            social_interaction = np.random.choice([0, 1], p=[0.7, 0.3])
            exercise_frequency = 0
            meditation_practice = 0
            work_life_balance = np.random.choice([1, 2], p=[0.7, 0.3])
            appetite_changes = 1
            concentration_issues = 1
            negative_thoughts = 1
            recent_life_event = np.random.choice([0, 1], p=[0.2, 0.8])
        
        record = {
            'current_mood': current_mood,
            'stress_level': stress_level,
            'anxiety_level': anxiety_level,
            'energy_level': energy_level,
            'motivation_level': motivation_level,
            'sleep_quality': sleep_quality,
            'sleep_hours': np.clip(sleep_hours, 3, 12),
            'social_interaction': social_interaction,
            'exercise_frequency': exercise_frequency,
            'meditation_practice': meditation_practice,
            'work_life_balance': work_life_balance,
            'appetite_changes': appetite_changes,
            'concentration_issues': concentration_issues,
            'negative_thoughts': negative_thoughts,
            'recent_life_event': recent_life_event,
            'mental_health_category': mental_status
        }
        
        data.append(record)
    
    return pd.DataFrame(data)


def generate_symptom_data(n_samples: int) -> pd.DataFrame:
    """
    Generate synthetic symptom data for severity classification.
    
    Features (binary with has_ prefix to match training script):
    - has_fever, has_headache, has_cough, has_fatigue, has_body_ache
    - has_nausea, has_diarrhea, has_vomiting, has_shortness_of_breath
    - has_chest_pain, has_dizziness, has_sore_throat, has_runny_nose
    - has_loss_of_taste_smell, has_abdominal_pain, has_rash
    - has_joint_pain, has_confusion
    
    Additional features:
    - symptom_count: number of symptoms
    - symptom_duration_days: 1-30
    - symptom_intensity: 1-5
    - age: 18-85
    
    Target: severity (0: Mild, 1: Moderate, 2: Severe)
    """
    
    # Define symptom weights for severity (matching train_symptom_severity.py)
    critical_symptoms = ['has_chest_pain', 'has_shortness_of_breath', 'has_confusion']
    moderate_symptoms = ['has_fever', 'has_vomiting', 'has_dizziness', 'has_abdominal_pain', 'has_diarrhea']
    mild_symptoms = ['has_fatigue', 'has_nausea', 'has_rash', 'has_joint_pain', 'has_body_ache', 
                     'has_sore_throat', 'has_runny_nose', 'has_headache', 'has_cough', 'has_loss_of_taste_smell']
    
    all_symptoms = critical_symptoms + moderate_symptoms + mild_symptoms
    
    data = []
    
    for _ in range(n_samples):
        # Determine severity
        severity = np.random.choice([0, 1, 2], p=[0.50, 0.35, 0.15])
        
        symptoms = {s: 0 for s in all_symptoms}
        
        if severity == 2:  # Critical
            # Has at least 1-2 critical symptoms
            n_critical = np.random.randint(1, 3)
            selected_critical = np.random.choice(critical_symptoms, n_critical, replace=False)
            for s in selected_critical:
                symptoms[s] = 1
            
            # May have some moderate symptoms too
            n_moderate = np.random.randint(0, 4)
            if n_moderate > 0:
                selected_moderate = np.random.choice(moderate_symptoms, min(n_moderate, len(moderate_symptoms)), replace=False)
                for s in selected_moderate:
                    symptoms[s] = 1
            
            symptom_intensity = np.random.choice([4, 5], p=[0.4, 0.6])
            symptom_duration = np.random.randint(1, 15)
            
        elif severity == 1:  # Moderate
            # Has 1-3 moderate symptoms, maybe mild ones
            n_moderate = np.random.randint(1, 4)
            selected_moderate = np.random.choice(moderate_symptoms, n_moderate, replace=False)
            for s in selected_moderate:
                symptoms[s] = 1
            
            n_mild = np.random.randint(0, 4)
            if n_mild > 0:
                selected_mild = np.random.choice(mild_symptoms, min(n_mild, len(mild_symptoms)), replace=False)
                for s in selected_mild:
                    symptoms[s] = 1
            
            symptom_intensity = np.random.choice([3, 4], p=[0.5, 0.5])
            symptom_duration = np.random.randint(2, 21)
            
        else:  # Mild
            # Only mild symptoms
            n_mild = np.random.randint(1, 5)
            selected_mild = np.random.choice(mild_symptoms, n_mild, replace=False)
            for s in selected_mild:
                symptoms[s] = 1
            
            # Very rarely might have one moderate
            if np.random.random() < 0.1:
                symptoms[np.random.choice(moderate_symptoms)] = 1
            
            symptom_intensity = np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2])
            symptom_duration = np.random.randint(1, 10)
        
        symptom_count = sum(symptoms.values())
        age = np.random.randint(18, 86)
        
        # Comorbidities more likely in older people
        has_comorbidities = 1 if np.random.random() < (0.1 + age / 200) else 0
        
        record = {
            **symptoms,
            'symptom_count': symptom_count,
            'symptom_duration_days': symptom_duration,
            'symptom_intensity': symptom_intensity,
            'age': age,
            'has_comorbidities': has_comorbidities,
            'severity': severity
        }
        
        data.append(record)
    
    return pd.DataFrame(data)


def main():
    parser = argparse.ArgumentParser(description='Generate training datasets for health prediction models')
    parser.add_argument('--samples', type=int, default=10000, help='Number of samples per dataset')
    parser.add_argument('--output-dir', type=str, default='data', help='Output directory for datasets')
    args = parser.parse_args()
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Generating datasets with {args.samples} samples each...")
    
    # Generate Physical Health Data
    print("Generating physical health dataset...")
    physical_df = generate_physical_health_data(args.samples)
    physical_path = os.path.join(args.output_dir, 'physical_health_data.csv')
    physical_df.to_csv(physical_path, index=False)
    print(f"  Saved to {physical_path}")
    print(f"  Class distribution:\n{physical_df['health_category'].value_counts().sort_index()}")
    
    # Generate Mental Health Data
    print("\nGenerating mental health dataset...")
    mental_df = generate_mental_health_data(args.samples)
    mental_path = os.path.join(args.output_dir, 'mental_health_data.csv')
    mental_df.to_csv(mental_path, index=False)
    print(f"  Saved to {mental_path}")
    print(f"  Class distribution:\n{mental_df['mental_health_category'].value_counts().sort_index()}")
    
    # Generate Symptom Data
    print("\nGenerating symptom severity dataset...")
    symptom_df = generate_symptom_data(args.samples)
    symptom_path = os.path.join(args.output_dir, 'symptom_data.csv')
    symptom_df.to_csv(symptom_path, index=False)
    print(f"  Saved to {symptom_path}")
    print(f"  Class distribution:\n{symptom_df['severity'].value_counts().sort_index()}")
    
    print("\nDataset generation complete!")


if __name__ == '__main__':
    main()
