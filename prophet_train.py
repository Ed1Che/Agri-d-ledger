import pandas as pd
import numpy as np
from prophet import Prophet
import joblib
import os
import warnings
warnings.filterwarnings('ignore')   # suppress Prophet's Stan output

os.makedirs('models/prophet', exist_ok=True)

print("=" * 55)
print("  PROPHET — STEP 1: LOADING PREPARED REGION DATA")
print("=" * 55)

regions = ['Eldoret', 'Kisii', 'Kisumu', 'Machakos', 'Meru', 'Mombasa', 'Nakuru', 'Nyeri']
# only train on regions that have data files
import glob
available = [os.path.basename(f).replace('_demand.csv','').title()
             for f in glob.glob('models/prophet/*_demand.csv')]
print(f"  Regions found: {sorted(available)}")

print("\n" + "=" * 55)
print("  PROPHET — STEP 2: TRAINING ONE MODEL PER REGION")
print("=" * 55)
print("  (Prophet fits a separate model for each region)")
print()

models = {}
metrics = {}

for region in sorted(available):
    path = f'models/prophet/{region.lower()}_demand.csv'
    df   = pd.read_csv(path, parse_dates=['ds'])

    print(f"  [{region}] Training on {len(df)} days...")

    # Train / test split — last 14 days as holdout
    train = df.iloc[:-14]
    test  = df.iloc[-14:]

    # ── Build Prophet model ──────────────────────────────────────────
    m = Prophet(
        yearly_seasonality=False,   # not enough data for yearly yet
        weekly_seasonality=True,    # market days vary day-of-week
        daily_seasonality=False,
        seasonality_mode='additive',
        changepoint_prior_scale=0.05,   # controls trend flexibility
        interval_width=0.80             # 80% confidence interval
    )

    # Add Kenyan agricultural seasons as custom seasonality
    m.add_seasonality(
        name='kenyan_season',
        period=182.5,        # ~6 months (two seasons per year)
        fourier_order=3
    )

    m.fit(train)

    # ── Forecast on test period ──────────────────────────────────────
    future   = m.make_future_dataframe(periods=14, freq='D')
    forecast = m.predict(future)

    # Evaluate on test set
    test_forecast = forecast[forecast['ds'].isin(test['ds'])][['ds','yhat','yhat_lower','yhat_upper']]
    merged = test.merge(test_forecast, on='ds')

    mae  = np.mean(np.abs(merged['y'] - merged['yhat']))
    rmse = np.sqrt(np.mean((merged['y'] - merged['yhat'])**2))
    mape = np.mean(np.abs((merged['y'] - merged['yhat']) / merged['y'])) * 100

    print(f"         MAE={mae:.1f} kg  |  RMSE={rmse:.1f} kg  |  MAPE={mape:.1f}%")

    models[region]  = m
    metrics[region] = {'mae': round(mae,2), 'rmse': round(rmse,2), 'mape': round(mape,2)}

    # Save model
    joblib.dump(m, f'models/prophet/{region.lower()}_prophet.pkl')
    print(f"         Saved: models/prophet/{region.lower()}_prophet.pkl")

print("\n" + "=" * 55)
print("  PROPHET — STEP 3: TRAINING SUMMARY")
print("=" * 55)
print(f"  {'Region':<12} {'MAE (kg)':<12} {'RMSE (kg)':<12} {'MAPE %':<10}")
print(f"  {'-'*46}")
for region, m in metrics.items():
    print(f"  {region:<12} {m['mae']:<12} {m['rmse']:<12} {m['mape']:<10}")

joblib.dump(metrics, 'models/prophet/all_metrics.pkl')
print(f"\n  Models saved for {len(models)} regions.")
print("  ✓ Training complete. Run 07_prophet_evaluate.py next.")