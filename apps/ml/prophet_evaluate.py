import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import joblib
import glob
import os
import warnings
warnings.filterwarnings('ignore')

os.makedirs('outputs', exist_ok=True)

print("=" * 55)
print("  PROPHET — STEP 1: LOADING MODELS")
print("=" * 55)

available = sorted([
    os.path.basename(f).replace('_prophet.pkl','').title()
    for f in glob.glob('models/prophet/*_prophet.pkl')
])
print(f"  Loaded models for: {available}")

print("\n" + "=" * 55)
print("  PROPHET — STEP 2: FORECAST NEXT 30 DAYS")
print("=" * 55)

all_forecasts = {}

for region in available:
    m   = joblib.load(f'models/prophet/{region.lower()}_prophet.pkl')
    df  = pd.read_csv(f'models/prophet/{region.lower()}_demand.csv', parse_dates=['ds'])

    # Forecast 30 days ahead
    future   = m.make_future_dataframe(periods=30, freq='D')
    forecast = m.predict(future)

    # Clip negative forecasts to 0 (demand can't be negative)
    forecast['yhat']       = forecast['yhat'].clip(lower=0).round(1)
    forecast['yhat_lower'] = forecast['yhat_lower'].clip(lower=0).round(1)
    forecast['yhat_upper'] = forecast['yhat_upper'].clip(lower=0).round(1)

    all_forecasts[region] = forecast

    # Print next 7 days
    future_only = forecast[forecast['ds'] > df['ds'].max()].head(7)
    print(f"\n  {region} — next 7 days demand forecast (kg):")
    print(f"  {'Date':<14} {'Predicted':>10} {'Low':>8} {'High':>8}")
    print(f"  {'-'*42}")
    for _, row in future_only.iterrows():
        print(f"  {str(row['ds'].date()):<14} {row['yhat']:>10.0f} "
              f"{row['yhat_lower']:>8.0f} {row['yhat_upper']:>8.0f}")

print("\n" + "=" * 55)
print("  PROPHET — STEP 3: SAVING FORECAST CHARTS")
print("=" * 55)

n = len(available)
fig = plt.figure(figsize=(16, 4 * n))
gs  = gridspec.GridSpec(n, 1, figure=fig, hspace=0.5)

colors = ['#534AB7','#1D9E75','#185FA5','#BA7517','#D85A30','#A32D2D','#0F6E56','#7F77DD']

for i, region in enumerate(available):
    ax  = fig.add_subplot(gs[i])
    df  = pd.read_csv(f'models/prophet/{region.lower()}_demand.csv', parse_dates=['ds'])
    fc  = all_forecasts[region]
    col = colors[i % len(colors)]

    # Historical actual
    ax.plot(df['ds'], df['y'], color=col, linewidth=1.5, label='Actual demand', zorder=3)

    # Forecast line
    future_fc = fc[fc['ds'] > df['ds'].max()]
    ax.plot(future_fc['ds'], future_fc['yhat'],
            color=col, linewidth=2, linestyle='--', label='30-day forecast')

    # Confidence band
    ax.fill_between(future_fc['ds'],
                    future_fc['yhat_lower'], future_fc['yhat_upper'],
                    alpha=0.2, color=col, label='80% confidence')

    # Vertical line at forecast start
    ax.axvline(df['ds'].max(), color='gray', linewidth=0.8, linestyle=':', alpha=0.7)
    ax.text(df['ds'].max(), ax.get_ylim()[0], ' forecast →',
            fontsize=9, color='gray', va='bottom')

    ax.set_title(f'{region} — maize demand forecast', fontsize=12, fontweight='bold')
    ax.set_ylabel('Quantity (kg)')
    ax.legend(fontsize=9, loc='upper left')
    ax.grid(alpha=0.25)

plt.suptitle('Prophet Demand Forecasts — All Regions', fontsize=14, fontweight='bold', y=1.01)
plt.savefig('outputs/prophet_forecasts.png', dpi=130, bbox_inches='tight')
print("  Saved: outputs/prophet_forecasts.png")

# Save all forecasts to CSV
rows = []
for region, fc in all_forecasts.items():
    fc_copy = fc[['ds','yhat','yhat_lower','yhat_upper']].copy()
    fc_copy['region'] = region
    rows.append(fc_copy)

all_df = pd.concat(rows).rename(columns={
    'ds':'date', 'yhat':'demand_forecast_kg',
    'yhat_lower':'demand_low_kg', 'yhat_upper':'demand_high_kg'
})
all_df.to_csv('outputs/prophet_forecasts.csv', index=False)
print("  Saved: outputs/prophet_forecasts.csv")

print("\n  ✓ Prophet evaluation complete.")
print("  ✓ Open outputs/prophet_forecasts.png to see all region charts.")
print("  ✓ Run 08_prophet_api.py next to add Prophet to the API.")