import os
import pandas as pd
import numpy as np
import kagglehub
from sklearn.model_selection import StratifiedKFold, GroupKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier

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
            
    return X, y, df

if __name__ == '__main__':
    X, y, df = get_data()
    
    print("--- SPATIAL AUTOCORRELATION CHECK ---")
    
    lat_col = next((c for c in df.columns if 'lat' in c.lower()), None)
    lon_col = next((c for c in df.columns if 'lon' in c.lower() or 'lng' in c.lower()), None)
    
    if lat_col and lon_col:
        print(f"Found location columns: {lat_col}, {lon_col}")
        
        # Grid cells of ~0.1 degrees
        groups = (np.floor(df[lat_col] * 10).astype(str) + '_' + np.floor(df[lon_col] * 10).astype(str)).values
        print(f"Created {len(np.unique(groups))} spatial groups.")
        
        rf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1)
        
        cv_strat = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        strat_aucs = cross_val_score(rf, X.values, y, cv=cv_strat, scoring='roc_auc')
        
        cv_group = GroupKFold(n_splits=5)
        group_aucs = cross_val_score(rf, X.values, y, groups=groups, cv=cv_group, scoring='roc_auc')
        
        print(f"StratifiedKFold AUC: {strat_aucs.mean():.4f}")
        print(f"GroupKFold AUC:      {group_aucs.mean():.4f}")
        
    else:
        print("No lat/lon columns found. Skipping spatial autocorrelation check.")
