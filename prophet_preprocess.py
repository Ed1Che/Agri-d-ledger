import pandas as pd
import numpy as np
import os

os.makedirs('models/prophet', exist_ok=True)
os.makedirs('outputs', exist_ok=True)

print("=" * 55)
print("  PROPHET — STEP 1: LOADING & PREPARING DATA")
print("=" * 55)

df = pd.read_csv('data/maize_prices.csv', parse_dates=['date'])
df = df.sort_values('date').reset_index(drop=True)

print(f"  Rows loaded  : {len(df)}")
print(f"  Regions      : {sorted(df['region'].unique())}")
print(f"  Date range   : {df['date'].min().date()} → {df['date'].max().date()}")

print("\n" + "=" * 55)
print("  PROPHET — STEP 2: AGGREGATE DAILY DEMAND PER REGION")
print("=" * 55)

# Prophet requires exactly two columns: ds (date) and y (value to forecast)
# We aggregate quantity_kg per region per day
region_data = {}
for region in sorted(df['region'].unique()):
    rdf = df[df['region'] == region][['date', 'quantity_kg']].copy()
    rdf.columns = ['ds', 'y']          # Prophet naming convention
    rdf = rdf.sort_values('ds').reset_index(drop=True)

    # Remove outliers beyond 3 std (keeps training stable)
    mean, std = rdf['y'].mean(), rdf['y'].std()
    rdf = rdf[(rdf['y'] >= mean - 3*std) & (rdf['y'] <= mean + 3*std)]

    region_data[region] = rdf
    print(f"  {region:<12} {len(rdf)} rows  |  avg demand: {rdf['y'].mean():.0f} kg  "
          f"|  min: {rdf['y'].min():.0f}  max: {rdf['y'].max():.0f}")

print("\n" + "=" * 55)
print("  PROPHET — STEP 3: SAVING PREPARED DATA PER REGION")
print("=" * 55)

for region, rdf in region_data.items():
    path = f'models/prophet/{region.lower()}_demand.csv'
    rdf.to_csv(path, index=False)
    print(f"  Saved: {path}")

print("\n  ✓ Prophet preprocessing complete.")
print("  ✓ Run 06_prophet_train.py next.")