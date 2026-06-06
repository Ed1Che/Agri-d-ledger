import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
import joblib
import os

# Get the script directory and set paths relative to workspace root
script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_root = os.path.dirname(script_dir)
os.chdir(workspace_root)
os.makedirs('models', exist_ok=True)

print("=" * 50)
print("  STEP 1: LOADING YOUR DATASET")
print("=" * 50)

df = pd.read_csv('data/maize_prices.csv', parse_dates=['date'])
df = df.sort_values('date').reset_index(drop=True)
print(f"  Rows loaded : {len(df)}")
print(f"  Columns     : {list(df.columns)}")
print(f"  Date range  : {df['date'].min().date()} → {df['date'].max().date()}")
print(f"  Regions     : {sorted(df['region'].unique())}")

print("\n" + "=" * 50)
print("  STEP 2: CREATING LAG AND SEASON FEATURES")
print("=" * 50)

# Create lag features (7-day and 14-day price lags)
df = df.sort_values(['region', 'date']).reset_index(drop=True)
df['lag_7'] = df.groupby('region')['price_kes_per_kg'].shift(7)
df['lag_14'] = df.groupby('region')['price_kes_per_kg'].shift(14)
print(f"  Lag features created (lag_7, lag_14)")

# Create season feature based on month
df['month'] = df['date'].dt.month
df['season'] = pd.cut(df['month'], bins=[0, 3, 6, 9, 12], labels=['Q1', 'Q2', 'Q3', 'Q4'])
print(f"  Season feature created")

print("\n" + "=" * 50)
print("  STEP 3: ENCODING REGION AND SEASON AS NUMBERS")
print("=" * 50)

le = LabelEncoder()
df['region_code'] = le.fit_transform(df['region'])
print(f"  Region map  : {dict(zip(le.classes_, le.transform(le.classes_)))}")

le_season = LabelEncoder()
df['season_code'] = le_season.fit_transform(df['season'].astype(str))
print(f"  Season map  : {dict(zip(le_season.classes_, le_season.transform(le_season.classes_)))}")

# Drop rows missing lag values (first 14 days per region)
df = df.dropna(subset=['lag_7', 'lag_14']).reset_index(drop=True)
print(f"\n  Rows after dropping early lags: {len(df)}")

print("\n" + "=" * 50)
print("  STEP 4: SELECTING FEATURES")
print("=" * 50)

FEATURES = [
    'price_kes_per_kg',   # target (index 0)
    'quantity_kg',
    'rainfall_mm',
    'season_code',
    'region_code',
    'lag_7',
    'lag_14',
]
print(f"  Features    : {FEATURES}")
print(f"  Target      : price_kes_per_kg (column 0)")

data = df[FEATURES].values
print(f"  Data shape  : {data.shape}")

print("\n" + "=" * 50)
print("  STEP 5: NORMALISING TO [0, 1]")
print("=" * 50)

scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(data)
print(f"  Price range before: {data[:,0].min():.1f} – {data[:,0].max():.1f} KES/kg")
print(f"  Price range after : {data_scaled[:,0].min():.3f} – {data_scaled[:,0].max():.3f}")

print("\n" + "=" * 50)
print("  STEP 6: CREATING 14-DAY SLIDING WINDOWS")
print("=" * 50)

WINDOW = 14
X, y = [], []
for i in range(WINDOW, len(data_scaled)):
    X.append(data_scaled[i - WINDOW:i])   # shape (14, 7)
    y.append(data_scaled[i, 0])            # predict price only

X = np.array(X)
y = np.array(y)
print(f"  Window size : {WINDOW} days")
print(f"  X shape     : {X.shape}   ← (samples, timesteps, features)")
print(f"  y shape     : {y.shape}   ← (samples,) — one price per sample")

print("\n" + "=" * 50)
print("  STEP 7: TRAIN / TEST SPLIT (80 / 20)")
print("=" * 50)

split = int(len(X) * 0.8)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]
print(f"  Training samples : {len(X_train)}")
print(f"  Test samples     : {len(X_test)}")

print("\n" + "=" * 50)
print("  STEP 8: SAVING PREPROCESSED DATA")
print("=" * 50)

np.save('models/X_train.npy', X_train)
np.save('models/X_test.npy',  X_test)
np.save('models/y_train.npy', y_train)
np.save('models/y_test.npy',  y_test)
joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(le,     'models/label_encoder.pkl')
joblib.dump(le_season, 'models/season_encoder.pkl')

print("  Saved: models/X_train.npy")
print("  Saved: models/X_test.npy")
print("  Saved: models/y_train.npy")
print("  Saved: models/y_test.npy")
print("  Saved: models/scaler.pkl")
print("  Saved: models/label_encoder.pkl")
print("  Saved: models/season_encoder.pkl")
print("\n  ✓ Preprocessing complete. Run 02_train_lstm.py next.")