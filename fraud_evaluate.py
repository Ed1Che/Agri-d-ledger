import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import joblib
import os

os.makedirs('outputs', exist_ok=True)

print("=" * 55)
print("  FRAUD — STEP 1: LOADING MODEL + DATA")
print("=" * 55)

model     = joblib.load('models/fraud/isolation_forest.pkl')
scaler    = joblib.load('models/fraud/fraud_scaler.pkl')
threshold = joblib.load('models/fraud/score_threshold.pkl')
FEATURES  = joblib.load('models/fraud/feature_names.pkl')
X_scaled  = np.load('models/fraud/X_scaled.npy')

fraud_labelled = pd.read_csv('models/fraud/synthetic_fraud_labelled.csv')
fraud_raw      = pd.read_csv('models/fraud/synthetic_fraud.csv')

print(f"  Model loaded     : IsolationForest (200 trees)")
print(f"  Decision threshold: {threshold:.4f}")

print("\n" + "=" * 55)
print("  FRAUD — STEP 2: SCORE ALL TRANSACTIONS")
print("=" * 55)

scores_normal = model.decision_function(X_scaled)
X_fraud_scaled = scaler.transform(fraud_raw.values)
scores_fraud   = model.decision_function(X_fraud_scaled)

# Combine for chart
all_scores = np.concatenate([scores_normal, scores_fraud])
all_labels = ['Normal'] * len(scores_normal) + ['Fraud'] * len(scores_fraud)

print(f"  Normal — avg score : {scores_normal.mean():.4f}")
print(f"  Fraud  — avg score : {scores_fraud.mean():.4f}")
print(f"  Threshold          : {threshold:.4f}")
print(f"  Transactions below threshold = FLAGGED as fraud")

print("\n" + "=" * 55)
print("  FRAUD — STEP 3: SAMPLE FRAUD ALERTS")
print("=" * 55)

fraud_labelled['anomaly_score'] = scores_fraud
fraud_labelled['flagged'] = scores_fraud < threshold
fraud_labelled['risk_level'] = pd.cut(
    scores_fraud,
    bins=[-np.inf, threshold - 0.05, threshold, np.inf],
    labels=['HIGH RISK', 'MEDIUM RISK', 'NORMAL']
)

print(f"\n  {'Fraud Type':<35} {'Score':>8} {'Risk':<14} {'Flagged'}")
print(f"  {'-'*68}")
for _, row in fraud_labelled.iterrows():
    flag = '🚨 YES' if row['flagged'] else '  no'
    print(f"  {row['fraud_type']:<35} {row['anomaly_score']:>8.4f} "
          f"{str(row['risk_level']):<14} {flag}")

print("\n" + "=" * 55)
print("  FRAUD — STEP 4: SAVING CHARTS")
print("=" * 55)

fig = plt.figure(figsize=(14, 10))
gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.35)

# Chart 1: Score distributions
ax1 = fig.add_subplot(gs[0, :])
ax1.hist(scores_normal, bins=40, alpha=0.6, color='#1D9E75',
         label=f'Normal ({len(scores_normal)} transactions)', density=True)
ax1.hist(scores_fraud,  bins=10, alpha=0.8, color='#E24B4A',
         label=f'Fraud ({len(scores_fraud)} transactions)', density=True)
ax1.axvline(threshold, color='orange', linewidth=2, linestyle='--',
            label=f'Decision threshold ({threshold:.3f})')
ax1.set_title('Anomaly Score Distribution — Normal vs Fraud', fontsize=12, fontweight='bold')
ax1.set_xlabel('Anomaly score (lower = more suspicious)')
ax1.set_ylabel('Density')
ax1.legend()
ax1.grid(alpha=0.3)
ax1.annotate('← FRAUD zone', xy=(threshold - 0.02, ax1.get_ylim()[1] * 0.8),
             fontsize=10, color='#E24B4A', ha='right')
ax1.annotate('NORMAL zone →', xy=(threshold + 0.02, ax1.get_ylim()[1] * 0.8),
             fontsize=10, color='#1D9E75', ha='left')

# Chart 2: Price deviation scatter
ax2 = fig.add_subplot(gs[1, 0])
df_orig = pd.read_csv('data/maize_prices.csv', parse_dates=['date'])
df_orig = df_orig.sort_values(['region', 'date']).reset_index(drop=True)
df_orig['lag_7'] = df_orig.groupby('region')['price_kes_per_kg'].shift(7)
df_orig['lag_14'] = df_orig.groupby('region')['price_kes_per_kg'].shift(14)
df_orig = df_orig.dropna(subset=['lag_7', 'lag_14'])
region_avg = df_orig.groupby('region')['price_kes_per_kg'].transform('mean')
price_dev_normal = (df_orig['price_kes_per_kg'] - region_avg)

ax2.scatter(range(len(price_dev_normal)), price_dev_normal,
            c='#1D9E75', alpha=0.3, s=15, label='Normal')
fraud_price_dev = fraud_labelled['price_kes_per_kg'] - df_orig['price_kes_per_kg'].mean()
ax2.scatter(range(len(fraud_price_dev)), fraud_price_dev,
            c='#E24B4A', alpha=0.9, s=60, marker='x', linewidths=2, label='Fraud')
ax2.axhline(0, color='gray', linewidth=0.8, linestyle='--')
ax2.set_title('Price Deviation from Regional Average', fontsize=11, fontweight='bold')
ax2.set_xlabel('Transaction index')
ax2.set_ylabel('Price deviation (KES/kg)')
ax2.legend(fontsize=9)
ax2.grid(alpha=0.3)

# Chart 3: Fraud types caught
ax3 = fig.add_subplot(gs[1, 1])
type_counts = fraud_labelled[fraud_labelled['flagged']]['fraud_type'].value_counts()
colors_bar  = ['#E24B4A', '#D85A30', '#BA7517', '#534AB7']
bars = ax3.barh(type_counts.index, type_counts.values,
                color=colors_bar[:len(type_counts)], alpha=0.85)
ax3.set_title('Fraud Types Successfully Caught', fontsize=11, fontweight='bold')
ax3.set_xlabel('Count flagged')
for bar, val in zip(bars, type_counts.values):
    ax3.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height()/2,
             str(val), va='center', fontsize=10)
ax3.grid(alpha=0.3, axis='x')

plt.suptitle('Isolation Forest Fraud Detection — Evaluation Report',
             fontsize=13, fontweight='bold')
plt.savefig('outputs/fraud_detection_report.png', dpi=130, bbox_inches='tight')
print("  Saved: outputs/fraud_detection_report.png")

# Save scored transactions
fraud_labelled.to_csv('outputs/fraud_alerts.csv', index=False)
print("  Saved: outputs/fraud_alerts.csv")

print(f"\n  ✓ Fraud evaluation complete.")
print(f"  ✓ Open outputs/fraud_detection_report.png to see charts.")
print(f"  ✓ Run 12_fraud_api.py to add fraud detection to the API.")