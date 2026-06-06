import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
import joblib
import os

os.makedirs('models/fraud', exist_ok=True)

print("=" * 55)
print("  ISOLATION FOREST — STEP 1: LOADING DATA")
print("=" * 55)

df = pd.read_csv('data/maize_prices.csv', parse_dates=['date'])
df = df.sort_values(['region', 'date']).reset_index(drop=True)
print(f"  Rows loaded  : {len(df)}")
print(f"  Columns      : {list(df.columns)}")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 2: ENGINEERING FRAUD FEATURES")
print("=" * 55)

# Create lag features for price history
# These are needed for the fraud change rate features below
df['lag_7'] = df.groupby('region')['price_kes_per_kg'].shift(7)
df['lag_14'] = df.groupby('region')['price_kes_per_kg'].shift(14)
print(f"  Lag features created: lag_7, lag_14")

# Encode region as number
le = LabelEncoder()
df['region_code'] = le.fit_transform(df['region'])

# Feature 1: price deviation from regional average
#   A buyer offering way below the regional avg is suspicious
region_avg = df.groupby('region')['price_kes_per_kg'].transform('mean')
region_std = df.groupby('region')['price_kes_per_kg'].transform('std')
df['price_deviation'] = (df['price_kes_per_kg'] - region_avg) / region_std

# Feature 2: quantity deviation from regional average
#   Unusually large or small quantities can signal manipulation
qty_avg = df.groupby('region')['quantity_kg'].transform('mean')
qty_std = df.groupby('region')['quantity_kg'].transform('std')
df['quantity_deviation'] = (df['quantity_kg'] - qty_avg) / qty_std

# Feature 3: price vs lag_7 change rate
#   Sudden price spikes vs 7-day history are suspicious
df['price_change_7d'] = (df['price_kes_per_kg'] - df['lag_7']) / df['lag_7'].replace(0, np.nan)
df['price_change_7d'] = df['price_change_7d'].fillna(0)

# Feature 4: price vs lag_14 change rate
df['price_change_14d'] = (df['price_kes_per_kg'] - df['lag_14']) / df['lag_14'].replace(0, np.nan)
df['price_change_14d'] = df['price_change_14d'].fillna(0)

# Feature 5: rainfall vs price correlation
#   High rainfall + very low price = possible distress selling manipulation
df['rain_price_ratio'] = df['rainfall_mm'] / df['price_kes_per_kg'].replace(0, np.nan)
df['rain_price_ratio'] = df['rain_price_ratio'].fillna(0)

# Drop rows with NaN from lag columns
df = df.dropna(subset=['lag_7', 'lag_14']).reset_index(drop=True)

FEATURES = [
    'price_kes_per_kg',
    'quantity_kg',
    'rainfall_mm',
    'region_code',
    'price_deviation',
    'quantity_deviation',
    'price_change_7d',
    'price_change_14d',
    'rain_price_ratio',
]

print(f"  Fraud features engineered: {len(FEATURES)}")
for f in FEATURES:
    print(f"    • {f}")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 3: SCALING FEATURES")
print("=" * 55)

X = df[FEATURES].values
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)
print(f"  Feature matrix shape : {X_scaled.shape}")
print(f"  Scaled range         : [{X_scaled.min():.3f}, {X_scaled.max():.3f}]")

print("\n" + "=" * 55)
print("  ISOLATION FOREST — STEP 4: INJECTING SYNTHETIC FRAUD")
print("=" * 55)

# Add clearly fraudulent transactions so we can verify the model catches them
np.random.seed(42)
n_fraud = 20
fraud_rows = []
for _ in range(n_fraud):
    row = {}
    fraud_type = np.random.choice(['low_price', 'high_price', 'huge_qty', 'tiny_qty'])
    avg_price = df['price_kes_per_kg'].mean()
    avg_qty   = df['quantity_kg'].mean()

    if fraud_type == 'low_price':       # buyer offering way too low
        row['price_kes_per_kg']  = round(avg_price * np.random.uniform(0.3, 0.5), 1)
        row['quantity_kg']       = int(avg_qty * np.random.uniform(0.8, 1.2))
        row['fraud_type']        = 'Suspiciously low price'
    elif fraud_type == 'high_price':    # inflated invoice price
        row['price_kes_per_kg']  = round(avg_price * np.random.uniform(1.8, 2.5), 1)
        row['quantity_kg']       = int(avg_qty * np.random.uniform(0.8, 1.2))
        row['fraud_type']        = 'Inflated price'
    elif fraud_type == 'huge_qty':      # impossibly large quantity
        row['price_kes_per_kg']  = round(avg_price * np.random.uniform(0.9, 1.1), 1)
        row['quantity_kg']       = int(avg_qty * np.random.uniform(4.0, 6.0))
        row['fraud_type']        = 'Unusually large quantity'
    else:                               # tiny quantity, suspicious price
        row['price_kes_per_kg']  = round(avg_price * np.random.uniform(0.4, 0.6), 1)
        row['quantity_kg']       = int(avg_qty * np.random.uniform(0.05, 0.15))
        row['fraud_type']        = 'Tiny quantity + low price'

    row['rainfall_mm']      = float(df['rainfall_mm'].mean())
    row['region_code']      = int(np.random.choice(df['region_code'].unique()))
    row['price_deviation']  = (row['price_kes_per_kg'] - avg_price) / df['price_kes_per_kg'].std()
    row['quantity_deviation']= (row['quantity_kg'] - avg_qty) / df['quantity_kg'].std()
    row['price_change_7d']  = row['price_deviation'] * 2
    row['price_change_14d'] = row['price_deviation'] * 1.5
    row['rain_price_ratio'] = row['rainfall_mm'] / max(row['price_kes_per_kg'], 1)
    fraud_rows.append(row)

fraud_df = pd.DataFrame(fraud_rows)
print(f"  Injected {n_fraud} synthetic fraud transactions:")
print(fraud_df['fraud_type'].value_counts().to_string())

# Save everything
np.save('models/fraud/X_scaled.npy', X_scaled)
joblib.dump(scaler, 'models/fraud/fraud_scaler.pkl')
joblib.dump(le,     'models/fraud/fraud_label_encoder.pkl')
fraud_df[FEATURES].to_csv('models/fraud/synthetic_fraud.csv', index=False)
fraud_df.to_csv('models/fraud/synthetic_fraud_labelled.csv', index=False)

# Save feature names for later use
joblib.dump(FEATURES, 'models/fraud/feature_names.pkl')

print(f"\n  Saved: models/fraud/X_scaled.npy")
print(f"  Saved: models/fraud/fraud_scaler.pkl")
print(f"  Saved: models/fraud/synthetic_fraud.csv")
print("\n  ✓ Fraud preprocessing complete. Run 10_fraud_train.py next.")