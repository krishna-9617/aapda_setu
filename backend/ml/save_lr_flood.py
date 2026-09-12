import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression

print("Training final Logistic Regression model for Flood...")
df = pd.read_csv("C:/Users/hp/.cache/kagglehub/datasets/naiyakhalid/flood-prediction-dataset/versions/2/train.csv")
# Use the same sample size as CV to avoid memory/time issues, or fit on full?
# Fit on full data for final model
target_col = 'FloodProbability'
X = df.drop(target_col, axis=1)
y = df[target_col]
y = (y > y.median()).astype(int)

X = X.fillna(X.median(numeric_only=True))
X = X.select_dtypes(include=['number'])

lr = LogisticRegression(max_iter=1000)
lr.fit(X, y)

joblib.dump(lr, "d:/aapda-setu/backend/ml/flood_model.pkl")
print("Saved flood_model.pkl as Logistic Regression.")