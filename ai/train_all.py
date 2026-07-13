#!/usr/bin/env python3
"""
Train All Models

This script generates datasets and trains all ML models for the AarogyaSaathi health app.
Run this script to create the trained models that can be exported to JSON for mobile inference.

Usage:
    python train_all.py --samples 10000
"""

import os
import sys
import argparse
import time

# Add training directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'training'))

from generate_dataset import generate_physical_health_data, generate_mental_health_data, generate_symptom_data
from train_physical_health import train_model as train_physical
from train_mental_health import train_model as train_mental
from train_symptom_severity import train_model as train_symptom


def main():
    parser = argparse.ArgumentParser(description='Train all health prediction models')
    parser.add_argument('--samples', type=int, default=10000,
                        help='Number of samples to generate for each dataset (default: 10000)')
    parser.add_argument('--skip-generation', action='store_true',
                        help='Skip dataset generation and use existing data')
    parser.add_argument('--data-dir', type=str, default='data',
                        help='Directory for datasets')
    parser.add_argument('--model-dir', type=str, default='models',
                        help='Directory for trained models')
    args = parser.parse_args()

    # Create directories
    os.makedirs(args.data_dir, exist_ok=True)
    os.makedirs(args.model_dir, exist_ok=True)

    total_start = time.time()

    # Step 1: Generate datasets
    if not args.skip_generation:
        print("=" * 60)
        print("STEP 1: Generating Training Datasets")
        print("=" * 60)
        
        print(f"\nGenerating {args.samples} samples for each dataset...")
        
        print("\n[1/3] Physical Health Data...")
        start = time.time()
        physical_df = generate_physical_health_data(args.samples)
        physical_path = os.path.join(args.data_dir, 'physical_health_data.csv')
        physical_df.to_csv(physical_path, index=False)
        print(f"      Saved to {physical_path} ({time.time()-start:.1f}s)")
        
        print("\n[2/3] Mental Health Data...")
        start = time.time()
        mental_df = generate_mental_health_data(args.samples)
        mental_path = os.path.join(args.data_dir, 'mental_health_data.csv')
        mental_df.to_csv(mental_path, index=False)
        print(f"      Saved to {mental_path} ({time.time()-start:.1f}s)")
        
        print("\n[3/3] Symptom Severity Data...")
        start = time.time()
        symptom_df = generate_symptom_data(args.samples)
        symptom_path = os.path.join(args.data_dir, 'symptom_data.csv')
        symptom_df.to_csv(symptom_path, index=False)
        print(f"      Saved to {symptom_path} ({time.time()-start:.1f}s)")
        
        print("\n✓ Dataset generation complete!")
    else:
        print("Skipping dataset generation (using existing data)")

    # Step 2: Train models
    print("\n" + "=" * 60)
    print("STEP 2: Training ML Models")
    print("=" * 60)

    # Physical Health Model
    print("\n[1/3] Training Physical Health Model...")
    print("-" * 40)
    physical_data_path = os.path.join(args.data_dir, 'physical_health_data.csv')
    if os.path.exists(physical_data_path):
        start = time.time()
        train_physical(physical_data_path, args.model_dir)
        print(f"Training completed in {time.time()-start:.1f}s")
    else:
        print(f"ERROR: Data file not found: {physical_data_path}")
        print("Run without --skip-generation to create datasets first")

    # Mental Health Model
    print("\n[2/3] Training Mental Health Model...")
    print("-" * 40)
    mental_data_path = os.path.join(args.data_dir, 'mental_health_data.csv')
    if os.path.exists(mental_data_path):
        start = time.time()
        train_mental(mental_data_path, args.model_dir)
        print(f"Training completed in {time.time()-start:.1f}s")
    else:
        print(f"ERROR: Data file not found: {mental_data_path}")

    # Symptom Severity Model
    print("\n[3/3] Training Symptom Severity Model...")
    print("-" * 40)
    symptom_data_path = os.path.join(args.data_dir, 'symptom_data.csv')
    if os.path.exists(symptom_data_path):
        start = time.time()
        train_symptom(symptom_data_path, args.model_dir)
        print(f"Training completed in {time.time()-start:.1f}s")
    else:
        print(f"ERROR: Data file not found: {symptom_data_path}")

    # Summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    
    total_time = time.time() - total_start
    print(f"\nTotal time: {total_time:.1f}s")
    
    # List output files
    print(f"\nGenerated files in {args.model_dir}/:")
    if os.path.exists(args.model_dir):
        for f in sorted(os.listdir(args.model_dir)):
            filepath = os.path.join(args.model_dir, f)
            size = os.path.getsize(filepath) / 1024
            print(f"  - {f} ({size:.1f} KB)")
    
    print("\n📱 Copy the .json files to your React Native app's assets folder")
    print("   to enable ML-powered health predictions.")


if __name__ == '__main__':
    main()
