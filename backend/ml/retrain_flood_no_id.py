"""
Retrain flood_model.pkl WITHOUT the `id` column.

Methodology matches the original train_flood_model.py exactly, except:
  - `id` is explicitly dropped before any feature use
  - 5-fold CV AUC is reported (the original script used a single train/test split;
    we add CV here so the AUC figure quoted in data_loader.py is actually cross-validated)
  - Model is saved to the correct relative path for the deployed backend

Background:
  The original model was trained with `id` as feature 0.  `id` is a sequential row
  counter in the Kaggle dataset (0, 1, 2, ...) and carries no flood-prediction signal —
  its learned coefficient is 7.094e-9, contributing zero to any prediction.  However,
  scikit-learn's feature-count guard raises "X has 20 features, expecting 21" when
  data_loader.py presents the 20 real features, so the ML blend has never run.

  This retrain removes `id`, so the model accepts the 20 real features data_loader
  actually provides.

Run:
    cd backend
    python -m ml.retrain_flood_no_id
"""

import os
import pathlib
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

# ── Dataset ──────────────────────────────────────────────────────────────────
TRAIN_CSV = pathlib.Path(
    r"C:/Users/hp/.cache/kagglehub/datasets/naiyakhalid/flood-prediction-dataset/versions/2/train.csv"
)

# ── Output ────────────────────────────────────────────────────────────────────
ML_DIR = pathlib.Path(__file__).parent
OUTPUT_PATH = ML_DIR / "flood_model.pkl"
AUC_THRESHOLD = 0.65  # model must beat this to be promoted

# ── Feature list (same 20 the original had, minus `id`) ──────────────────────
FEATURES = [
    "MonsoonIntensity", "TopographyDrainage", "RiverManagement",
    "Deforestation", "Urbanization", "ClimateChange",
    "DamsQuality", "Siltation", "AgriculturalPractices",
    "Encroachments", "IneffectiveDisasterPreparedness", "DrainageSystems",
    "CoastalVulnerability", "Landslides", "Watersheds",
    "DeterioratingInfrastructure", "PopulationScore", "WetlandLoss",
    "InadequatePlanning", "PoliticalFactors",
]
TARGET = "FloodProbability"


def load_and_prepare():
    print(f"Loading {TRAIN_CSV} ...")
    df = pd.read_csv(TRAIN_CSV)
    print(f"  Shape: {df.shape}")

    # Confirm `id` is present and drop it
    if "id" in df.columns:
        df = df.drop(columns=["id"])
        print("  Dropped column: id")

    # Confirm all 20 features are present
    missing = [f for f in FEATURES if f not in df.columns]
    if missing:
        print(f"ERROR: missing features: {missing}", file=sys.stderr)
        sys.exit(1)

    X = df[FEATURES].fillna(df[FEATURES].median())
    y_raw = df[TARGET]

    # Same binarisation as original: above-median = 1
    median_val = float(y_raw.median())
    y = (y_raw > median_val).astype(int)
    print(f"  Target median: {median_val:.4f}  ->  class balance: {y.mean():.3f}")
    return X, y


def main():
    X, y = load_and_prepare()

    # ── Train / test split (same seed as original) ───────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\nTrain rows: {len(X_train):,}   Test rows: {len(X_test):,}")

    # ── Logistic Regression (same hyperparams as original) ───────────────────
    print("\nTraining Logistic Regression (max_iter=1000) ...")
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)

    # Hold-out AUC
    test_probs = lr.predict_proba(X_test)[:, 1]
    holdout_auc = roc_auc_score(y_test, test_probs)
    print(f"  Hold-out AUC:      {holdout_auc:.4f}")

    # ── 5-fold cross-validated AUC ───────────────────────────────────────────
    print("\nRunning 5-fold CV (this may take ~2–3 minutes on 1.1M rows) ...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    # Use a smaller LR for CV speed on the full dataset — same model class
    lr_cv = LogisticRegression(max_iter=1000, random_state=42)
    cv_scores = cross_val_score(lr_cv, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
    cv_auc_mean = float(cv_scores.mean())
    cv_auc_std = float(cv_scores.std())
    print(f"  5-fold CV AUC:     {cv_auc_mean:.4f} ± {cv_auc_std:.4f}")
    print(f"  Per-fold scores:   {[round(s, 4) for s in cv_scores]}")

    # ── Feature verification ─────────────────────────────────────────────────
    print(f"\nModel feature_names_in_: {list(lr.feature_names_in_)}")
    assert list(lr.feature_names_in_) == FEATURES, "Feature list mismatch!"
    assert lr.n_features_in_ == 20, f"Expected 20 features, got {lr.n_features_in_}"
    assert "id" not in lr.feature_names_in_, "id must not be in trained model"
    print(f"  Feature count: 20 OK   id absent OK")

    # ── Promotion decision ───────────────────────────────────────────────────
    if cv_auc_mean < AUC_THRESHOLD:
        print(
            f"\nNOT PROMOTED: CV AUC {cv_auc_mean:.4f} < threshold {AUC_THRESHOLD}."
            f" flood_model.pkl unchanged."
        )
        return 1

    # Refit on full dataset for the deployed model (same as save_lr_flood.py did)
    print(f"\nCV AUC {cv_auc_mean:.4f} >= {AUC_THRESHOLD} -- promoting. Refitting on full data ...")
    lr_final = LogisticRegression(max_iter=1000, random_state=42)
    lr_final.fit(X, y)

    joblib.dump(lr_final, OUTPUT_PATH)
    print(f"Saved: {OUTPUT_PATH}")
    print(f"\n{'='*60}")
    print(f"RETRAIN COMPLETE")
    print(f"  Features:          20 (id excluded)")
    print(f"  Hold-out AUC:      {holdout_auc:.4f}")
    print(f"  5-fold CV AUC:     {cv_auc_mean:.4f} +/- {cv_auc_std:.4f}")
    print(f"  Model:             LogisticRegression(max_iter=1000)")
    print(f"  Trained on:        {len(X):,} samples (full dataset, refitted)")
    print(f"{'='*60}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

