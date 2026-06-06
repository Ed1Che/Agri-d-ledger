import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os

print("=" * 55)
print("  ISOLATION FOREST — STEP 1: LOADING DATA")
print("=" * 55)

X_scaled  = np.load('models/fraud/X_scaled.npy')
scaler    = joblib.load('models/fraud/fraud_scaler.pkl')
FEATURES  = joblib.load('models/fraud/feature_names.pkl')
fraud_raw = pd.read_csv('models/fraud/synthetic_fraud.csv')

print(f"  Normal transactions : {len(X_scaled)}")
print(f"  Synthetic fraud rows: {len(fraud_raw)}")
print(f"  Features used       : {len(FEATURES)}")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 2: TRAINING THE MODEL")
print("=" * 55)
print("""
  How Isolation Forest works:
  ─────────────────────────────────────────────────────
  • Grows 200 random decision trees
  • Each tree randomly splits features until every
    transaction is isolated in its own leaf node
  • NORMAL transactions sit in dense clusters →
    need MANY splits to isolate → long path length
  • FRAUD transactions are outliers in sparse regions →
    isolated in FEW splits → short path length
  • Anomaly score = average path length across all trees
    Score close to 1.0 = very likely fraud
    Score close to 0.0 = very likely normal
  ─────────────────────────────────────────────────────
""")

model = IsolationForest(
    n_estimators=200,        # number of trees
    max_samples='auto',      # samples per tree
    contamination=0.05,      # expect ~5% anomalies in real data
    max_features=1.0,        # use all features per tree
    bootstrap=False,
    random_state=42,
    verbose=0
)

model.fit(X_scaled)
print(f"  ✓ Trained on {len(X_scaled)} transactions with 200 trees")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 3: SCORING NORMAL DATA")
print("=" * 55)

# Score all normal transactions
scores_normal = model.decision_function(X_scaled)   # higher = more normal
preds_normal  = model.predict(X_scaled)              # 1=normal, -1=anomaly

flagged_normal = (preds_normal == -1).sum()
print(f"  Normal transactions scored : {len(scores_normal)}")
print(f"  Incorrectly flagged as fraud: {flagged_normal} "
      f"({flagged_normal/len(scores_normal)*100:.1f}%) — false positive rate")
print(f"  Avg anomaly score (normal)  : {scores_normal.mean():.4f}")
print(f"  Min anomaly score (normal)  : {scores_normal.min():.4f}")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 4: CATCHING SYNTHETIC FRAUD")
print("=" * 55)

X_fraud_scaled = scaler.transform(fraud_raw.values)
scores_fraud   = model.decision_function(X_fraud_scaled)
preds_fraud    = model.predict(X_fraud_scaled)

caught = (preds_fraud == -1).sum()
print(f"  Synthetic fraud transactions : {len(preds_fraud)}")
print(f"  Correctly caught as fraud    : {caught} ({caught/len(preds_fraud)*100:.1f}%)")
print(f"  Missed (false negatives)     : {len(preds_fraud)-caught}")
print(f"  Avg anomaly score (fraud)    : {scores_fraud.mean():.4f}")

print("\n  Score comparison:")
print(f"  Normal transactions avg score : {scores_normal.mean():+.4f}  (positive = normal)")
print(f"  Fraud  transactions avg score : {scores_fraud.mean():+.4f}  (negative = anomaly)")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 5: FEATURE IMPORTANCE")
print("=" * 55)
print("  (Which features are most useful for catching fraud)")

# Approximate importance: measure score drop when each feature is shuffled
importances = []
base_score = scores_fraud.mean()
for i, feat in enumerate(FEATURES):
    X_shuffled = X_fraud_scaled.copy()
    np.random.shuffle(X_shuffled[:, i])
    shuffled_score = model.decision_function(X_shuffled).mean()
    importance = abs(shuffled_score - base_score)
    importances.append((feat, importance))

importances.sort(key=lambda x: x[1], reverse=True)
for feat, imp in importances:
    bar = '█' * int(imp * 200)
    print(f"  {feat:<22} {bar} {imp:.4f}")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 6: SAVING MODEL")
print("=" * 55)

joblib.dump(model, 'models/fraud/isolation_forest.pkl')
print("  Saved: models/fraud/isolation_forest.pkl")

# Save threshold (5th percentile of normal scores = decision boundary)
threshold = np.percentile(scores_normal, 5)
joblib.dump(threshold, 'models/fraud/score_threshold.pkl')
print(f"  Saved: models/fraud/score_threshold.pkl  (threshold={threshold:.4f})")

print("\n  ✓ Training complete. Run 11_fraud_evaluate.py next.")