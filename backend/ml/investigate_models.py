import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

def investigate_dataset(name, path, target_col, is_categorical_target=False):
    print(f"\n{'='*50}\nINVESTIGATING {name.upper()}\n{'='*50}")
    df = pd.read_csv(path)
    
    # 3. Check Duplicates (On full dataset)
    print("\n3. DUPLICATE ROWS:")
    dup_count = df.duplicated().sum()
    print(f"Total rows: {len(df)}, Duplicate rows: {dup_count} ({(dup_count/len(df))*100:.2f}%)")
    
    if len(df) > 50000:
        print(f"\nDataset is very large ({len(df)} rows). Sampling 50000 rows for CV speed.")
        df = df.sample(50000, random_state=42)
    
    # 1. Check for Leakage & Features
    features = [c for c in df.columns if c != target_col]
    print(f"\n1. FEATURES ({len(features)}):")
    print(features)
    if target_col in features:
        print(f"CRITICAL WARNING: Target '{target_col}' leaked into features!")
        
    # 2. Check Class Balance
    print("\n2. CLASS BALANCE:")
    if is_categorical_target:
        print(df[target_col].value_counts(normalize=True))
        y = df[target_col].isin(['High', 'Very High']).astype(int)
    else:
        if df[target_col].dtype in ['float64', 'float32']:
            y = (df[target_col] > df[target_col].median()).astype(int)
            print("Target is continuous; thresholded at median. Balance:")
            print(y.value_counts(normalize=True))
        else:
            y = df[target_col]
            print(y.value_counts(normalize=True))
            
    # 4. 5-Fold Cross Validation
    print("\n4. 5-FOLD CROSS VALIDATION (AUC-ROC):")
    X = df[features]
    X = X.fillna(X.median(numeric_only=True))
    X = X.select_dtypes(include=['number'])
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    lr = LogisticRegression(max_iter=1000)
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    
    lr_scores = cross_val_score(lr, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)
    rf_scores = cross_val_score(rf, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)
    
    print(f"Logistic Regression: Mean AUC = {lr_scores.mean():.4f}, Std = {lr_scores.std():.4f}")
    print(f"Random Forest      : Mean AUC = {rf_scores.mean():.4f}, Std = {rf_scores.std():.4f}")

# Flood
investigate_dataset(
    "Flood Dataset", 
    "C:/Users/hp/.cache/kagglehub/datasets/naiyakhalid/flood-prediction-dataset/versions/2/train.csv", 
    "FloodProbability"
)

# Landslide
investigate_dataset(
    "Landslide Dataset", 
    "C:/Users/hp/.cache/kagglehub/datasets/sreeragunandha/landslide-prediction-dataset/versions/1/regenerated_landslide_risk_dataset.csv", 
    "Landslide Risk Prediction",
    is_categorical_target=True
)