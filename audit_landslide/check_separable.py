import os
import pandas as pd
import numpy as np
import kagglehub
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score

def get_data():
    dataset_path = kagglehub.dataset_download("sreeragunandha/landslide-prediction-dataset")
    csv_file = [f for f in os.listdir(dataset_path) if f.endswith('.csv')][0]
    df = pd.read_csv(os.path.join(dataset_path, csv_file))
    
    target_col = next(
        c for c in df.columns
        if any(w in c.lower() for w in ('landslide', 'risk', 'target', 'class'))
    )
    
    raw_target = df[target_col]
    try:
        raw_vals = raw_target.tolist()
        HIGH_RISK = {'High', 'Very High'}
        y = np.array([1 if str(v).strip() in HIGH_RISK else 0 for v in raw_vals])
    except:
        y = (pd.to_numeric(raw_target, errors='coerce').fillna(0) >
             pd.to_numeric(raw_target, errors='coerce').median()).astype(int).values
             
    feature_cols = [c for c in df.columns if c != target_col]
    X = df[feature_cols].copy()
    
    for col in X.columns:
        if X[col].dtype in (float, 'float64', 'float32', int, 'int64'):
            X[col] = X[col].fillna(X[col].median())
            
    return X, y, feature_cols

if __name__ == '__main__':
    X, y, feature_cols = get_data()
    
    print("--- TRIVIALLY SEPARABLE CLASSES CHECK ---")
    
    # 1. Compare feature distributions
    print("Feature Distributions (Positives vs Negatives):")
    for col in feature_cols:
        pos_mean = X.loc[y == 1, col].mean()
        neg_mean = X.loc[y == 0, col].mean()
        pos_std = X.loc[y == 1, col].std()
        neg_std = X.loc[y == 0, col].std()
        
        print(f"  {col}:")
        print(f"    Positive (Landslide=1): Mean = {pos_mean:.2f}, Std = {pos_std:.2f}")
        print(f"    Negative (Landslide=0): Mean = {neg_mean:.2f}, Std = {neg_std:.2f}")
        
    print()
    
    # 2. Depth-1 Decision Tree
    # Find the top feature by single-feature AUC
    best_auc = 0
    best_feature = None
    
    for col in feature_cols:
        auc1 = roc_auc_score(y, X[col].values)
        auc2 = roc_auc_score(y, -X[col].values)
        auc = max(auc1, auc2)
        if auc > best_auc:
            best_auc = auc
            best_feature = col
            
    print(f"Top feature based on single-feature AUC: {best_feature} (AUC = {best_auc:.4f})")
    
    dt = DecisionTreeClassifier(max_depth=1, random_state=42)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    dt_aucs = cross_val_score(dt, X[[best_feature]], y, cv=cv, scoring='roc_auc')
    mean_dt_auc = dt_aucs.mean()
    
    print(f"Depth-1 Decision Tree AUC (using {best_feature}): {mean_dt_auc:.4f}")
    
    if mean_dt_auc > 0.95:
        print(">>> FLAG: Classes are trivially separable using a single split on one feature.")
        print(f">>> It is highly likely the negative class was generated synthetically or sampled from a trivially different distribution (e.g., flat non-landslide areas).")
    else:
        print("Classes do not appear trivially separable by a single feature split.")
