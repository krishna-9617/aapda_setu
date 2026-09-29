import os
import pandas as pd
import numpy as np
import kagglehub
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score

def get_data():
    dataset_path = kagglehub.dataset_download("sreeragunandha/landslide-prediction-dataset")
    csv_file = [f for f in os.listdir(dataset_path) if f.endswith('.csv')][0]
    df = pd.read_csv(os.path.join(dataset_path, csv_file))
    
    target_col = next(
        c for c in df.columns
        if any(w in c.lower() for w in ('landslide', 'risk', 'target', 'class'))
    )
    
    feature_cols = [c for c in df.columns if c != target_col]
    X = df[feature_cols].copy()
    
    for col in X.columns:
        if X[col].dtype in (float, 'float64', 'float32', int, 'int64'):
            X[col] = X[col].fillna(X[col].median())
    
    raw_target = df[target_col]
    try:
        raw_vals = raw_target.tolist()
        HIGH_RISK = {'High', 'Very High'}
        y = np.array([1 if str(v).strip() in HIGH_RISK else 0 for v in raw_vals])
    except:
        y = (pd.to_numeric(raw_target, errors='coerce').fillna(0) >
             pd.to_numeric(raw_target, errors='coerce').median()).astype(int).values
             
    return X, y, feature_cols

if __name__ == '__main__':
    X, y, feature_cols = get_data()
    
    rf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1)
    rf.fit(X.values, y)
    
    print("--- LABEL LEAKAGE CHECK ---")
    importances = rf.feature_importances_
    
    for i, col in enumerate(feature_cols):
        imp = importances[i]
        
        col_vals = X[col].values
        # AUC for single feature (try both positive and negative correlation)
        auc1 = roc_auc_score(y, col_vals)
        auc2 = roc_auc_score(y, -col_vals)
        auc = max(auc1, auc2)
        
        flagged = imp > 0.5 or auc > 0.95
        
        print(f"Feature: {col}")
        print(f"  Importance: {imp:.4f}")
        print(f"  Single-feature AUC: {auc:.4f}")
        if flagged:
            print(f"  >>> FLAG: Potential Leakage!")
        print()
