import pandas as pd
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score

def train_and_evaluate(dataset_path, model_path, target_col):
    csv_file = [f for f in os.listdir(dataset_path) if f.endswith('.csv')][0]
    df = pd.read_csv(os.path.join(dataset_path, csv_file))
    print(f"\n--- Training on {csv_file} ---")
    print(f"Schema:\n{df.dtypes}")
    
    X = df.drop(target_col, axis=1)
    y = df[target_col]
    
    # Simple cleaning: fill missing values
    X = X.fillna(X.median(numeric_only=True))
    # Drop non-numeric columns for simplicity in this baseline
    X = X.select_dtypes(include=['number'])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Logistic Regression...")
    lr = LogisticRegression(max_iter=1000)
    lr.fit(X_train, y_train)
    lr_probs = lr.predict_proba(X_test)[:, 1]
    
    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_probs = rf.predict_proba(X_test)[:, 1]
    
    lr_preds = lr.predict(X_test)
    rf_preds = rf.predict(X_test)
    
    def eval_model(name, preds, probs):
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        auc = roc_auc_score(y_test, probs)
        print(f"[{name}] Accuracy: {acc:.3f}, Precision: {prec:.3f}, Recall: {rec:.3f}, AUC-ROC: {auc:.3f}")
        return auc
        
    lr_auc = eval_model("Logistic Regression", lr_preds, lr_probs)
    rf_auc = eval_model("Random Forest", rf_preds, rf_probs)
    
    best_auc = max(lr_auc, rf_auc)
    best_name = "Random Forest" if rf_auc > lr_auc else "Logistic Regression"
    best_model = rf if rf_auc > lr_auc else lr
    
    if best_auc > 0.65:
        print(f"Result: {best_name} achieved AUC={best_auc:.3f} — [PROMOTED to 🟡]")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        joblib.dump(best_model, model_path)
    else:
        print(f"Result: {best_name} achieved AUC={best_auc:.3f} — [NOT PROMOTED, staying deterministic-only]")
