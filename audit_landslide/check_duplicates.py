import os
import pandas as pd
import numpy as np
import kagglehub
from sklearn.model_selection import StratifiedKFold

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
    
    return X, y

if __name__ == '__main__':
    X, y = get_data()
    
    print("--- DUPLICATES CHECK ---")
    
    exact_dupes = X.duplicated().sum()
    print(f"Exact duplicate rows: {exact_dupes}")
    
    X_rounded = X.round(3)
    near_dupes = X_rounded.duplicated().sum()
    print(f"Near-duplicate rows (rounded to 3 decimals): {near_dupes}")
    
    # Check data leakage across folds due to near-duplicates
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # Create a unique signature for each row based on rounded features
    row_signatures = X_rounded.apply(lambda row: tuple(row), axis=1)
    
    total_leaked = 0
    for fold, (train_idx, test_idx) in enumerate(cv.split(X, y)):
        train_sigs = set(row_signatures.iloc[train_idx])
        test_sigs = row_signatures.iloc[test_idx]
        
        leaked_in_fold = sum(1 for sig in test_sigs if sig in train_sigs)
        print(f"Fold {fold}: {leaked_in_fold} test rows leaked (exact/near duplicate of train row)")
        total_leaked += leaked_in_fold
        
    print(f"Total leaked rows across all 5 folds: {total_leaked}")
