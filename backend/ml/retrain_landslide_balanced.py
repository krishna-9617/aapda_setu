"""
retrain_landslide_balanced.py — fixed version
Retrains with class_weight='balanced' to fix the AUC=1.000 / phi=0 degenerate model.
Handles: degree-symbol column name, pandas StringDtype binarization, correct 5-feature set.
"""
import os, sys
import numpy as np
import pandas as pd
import joblib
import kagglehub
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

MODEL_PATH = r"C:\Users\hp\Downloads\files (2)\aapda-setu\backend\ml\landslide_model.pkl"

print("Downloading landslide dataset (cached if already fetched)...")
dataset_path = kagglehub.dataset_download("sreeragunandha/landslide-prediction-dataset")
csv_file = [f for f in os.listdir(dataset_path) if f.endswith('.csv')][0]
df = pd.read_csv(os.path.join(dataset_path, csv_file))

print(f"Dataset: {csv_file}  shape={df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"dtypes:\n{df.dtypes}\n")

# Identify target column
target_col = next(
    c for c in df.columns
    if any(w in c.lower() for w in ('landslide', 'risk', 'target', 'class'))
)
print(f"Target column: {target_col}")
raw_target = df[target_col]
print(f"Target sample values: {raw_target.unique()[:10]}")

# Identify the 5 feature columns (same order as data_loader.py inference)
# Dataset has 'Temperature (°C)' (degree symbol); data_loader uses 'Temperature (C)'
# Since .values is used at inference, order matters not names
feature_cols = [c for c in df.columns if c != target_col]
print(f"\nFeature columns ({len(feature_cols)}): {feature_cols}")
if len(feature_cols) != 5:
    print(f"WARNING: Expected 5 features, got {len(feature_cols)}")

X = df[feature_cols].copy()
# Fill NaN with median
for col in X.columns:
    if X[col].dtype in (float, 'float64', 'float32', int, 'int64'):
        X[col] = X[col].fillna(X[col].median())

# Binarise target robustly — handles both object and StringDtype
try:
    raw_vals = raw_target.tolist()  # convert to plain Python list to avoid dtype issues
    HIGH_RISK = {'High', 'Very High'}
    y = np.array([1 if str(v).strip() in HIGH_RISK else 0 for v in raw_vals])
except Exception as e:
    print(f"Categorical binarization failed ({e}), trying numeric median split")
    y = (pd.to_numeric(raw_target, errors='coerce').fillna(0) >
         pd.to_numeric(raw_target, errors='coerce').median()).astype(int).values

y = y.astype(int)
print(f"\nClass distribution: {dict(zip(*np.unique(y, return_counts=True)))}")
pos_rate = y.mean()
neg_rate = 1 - pos_rate
print(f"  Positive rate: {pos_rate:.4f}  imbalance: {neg_rate/max(pos_rate,1e-9):.1f}:1")

# 5-fold stratified CV
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

print("\nTraining Logistic Regression (class_weight='balanced')...")
lr = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
lr_aucs = cross_val_score(lr, X.values, y, cv=cv, scoring='roc_auc')
print(f"  LR 5-fold AUC: {[f'{a:.4f}' for a in lr_aucs]}  mean={lr_aucs.mean():.4f}")

print("\nTraining Random Forest (class_weight='balanced')...")
rf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1)
rf_aucs = cross_val_score(rf, X.values, y, cv=cv, scoring='roc_auc')
print(f"  RF 5-fold AUC: {[f'{a:.4f}' for a in rf_aucs]}  mean={rf_aucs.mean():.4f}")

# Pick best
if rf_aucs.mean() >= lr_aucs.mean():
    best_name, best_auc, best_model = "Random Forest (balanced)", rf_aucs.mean(), rf
else:
    best_name, best_auc, best_model = "Logistic Regression (balanced)", lr_aucs.mean(), lr

print(f"\nBest: {best_name}  5-fold CV AUC={best_auc:.4f}")

# Refit on full dataset
best_model.fit(X.values, y)

# Sanity check: phi must NOT be uniformly 0.0 anymore
test_rows = np.array([
    [28.5, 85.0, 1500, 60.0,  50],   # low elevation, moderate precip
    [32.0, 95.0, 2500, 80.0, 200],   # higher elevation, high precip → more risk
    [25.0, 70.0,  500, 40.0,  20],   # dry, flat → low risk
])
phi_check = best_model.predict_proba(test_rows)[:, 1]
print(f"\nSanity-check phi_ls values (should vary, not all 0.0):")
print(f"  low-risk input:    {phi_check[0]:.4f}")
print(f"  high-risk input:   {phi_check[1]:.4f}")
print(f"  minimal-risk input:{phi_check[2]:.4f}")
all_zero = all(p < 1e-6 for p in phi_check)
print(f"  Still degenerate: {all_zero}  <- must be False")
if all_zero:
    print("  ERROR: Model is still degenerate — phi=0 for all inputs despite balanced training")
    sys.exit(1)

# Save
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(best_model, MODEL_PATH)
print(f"\nSaved to: {MODEL_PATH}")
print(f"RESULT: {best_name}  5-fold CV AUC={best_auc:.4f}  (was: Random Forest degenerate AUC=1.000)")
