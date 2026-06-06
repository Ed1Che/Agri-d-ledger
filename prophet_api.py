import joblib
import glob
import os
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tensorflow.keras.models import load_model
import uvicorn

warnings.filterwarnings('ignore')

# ── Load LSTM (price) ──────────────────────────────────────────────────────
print("Loading LSTM price model...")
lstm_model  = load_model('models/best_lstm.keras')
scaler      = joblib.load('models/scaler.pkl')
le          = joblib.load('models/label_encoder.pkl')

# ── Load Prophet (demand) — one model per region ──────────────────────────
print("Loading Prophet demand models...")
prophet_models = {}
for path in glob.glob('models/prophet/*_prophet.pkl'):
    region = os.path.basename(path).replace('_prophet.pkl','').title()
    prophet_models[region] = joblib.load(path)
    print(f"  Loaded Prophet for {region}")

print(f"Ready. LSTM + Prophet loaded for {len(prophet_models)} regions.\n")

app = FastAPI(
    title="Maize Market Intelligence API",
    description="Predicts fair price (LSTM) + demand forecast (Prophet) for Kenyan maize markets",
    version="2.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Request / Response schemas ─────────────────────────────────────────────
class PriceRequest(BaseModel):
    window: list[list[float]]   # 14 x 7 array
    region_name: str = "Nakuru"

class PriceResponse(BaseModel):
    region: str
    predicted_price_kes_kg: float
    price_lower: float
    price_upper: float
    demand_forecast_kg: float
    demand_low_kg: float
    demand_high_kg: float
    demand_signal: str          # "HIGH" / "NORMAL" / "LOW"
    advice: str                 # plain-English advice for farmer

LSTM_RMSE = 4.5

def inverse_price(val):
    dummy = np.zeros((1, 7))
    dummy[0, 0] = float(val)
    return round(float(scaler.inverse_transform(dummy)[0, 0]), 2)

def demand_signal(forecast_kg, region):
    """Compare forecast to historical average for this region."""
    path = f'models/prophet/{region.lower()}_demand.csv'
    if os.path.exists(path):
        hist = pd.read_csv(path)
        avg  = hist['y'].mean()
        if forecast_kg > avg * 1.10:  return "HIGH"
        if forecast_kg < avg * 0.90:  return "LOW"
    return "NORMAL"

# ── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status":  "running",
        "version": "2.0 — LSTM + Prophet",
        "models":  ["LSTM price prediction", "Prophet demand forecasting"],
        "regions": sorted(prophet_models.keys()),
    }

@app.get("/regions")
def get_regions():
    return {"regions": [
        {"name": r, "lstm_code": int(le.transform([r])[0])
         if r in le.classes_ else "n/a"}
        for r in sorted(prophet_models.keys())
    ]}

@app.post("/predict")
def predict(req: PriceRequest):
    region = req.region_name

    # ── LSTM: price prediction ─────────────────────────────────────
    if len(req.window) != 14 or any(len(r) != 7 for r in req.window):
        raise HTTPException(400, "Window must be 14 rows × 7 features.")

    raw    = np.array(req.window)
    scaled = scaler.transform(raw).reshape(1, 14, 7)
    price  = inverse_price(lstm_model.predict(scaled, verbose=0)[0, 0])

    # ── Prophet: demand forecast ───────────────────────────────────
    if region not in prophet_models:
        raise HTTPException(404, f"No Prophet model for region '{region}'. "
                                 f"Available: {sorted(prophet_models.keys())}")

    m        = prophet_models[region]
    future   = m.make_future_dataframe(periods=1, freq='D')
    forecast = m.predict(future).iloc[-1]
    demand   = max(0, round(float(forecast['yhat']), 1))
    d_low    = max(0, round(float(forecast['yhat_lower']), 1))
    d_high   = max(0, round(float(forecast['yhat_upper']), 1))
    signal   = demand_signal(demand, region)

    # ── Plain-English advice ───────────────────────────────────────
    if signal == "HIGH":
        advice = (f"Good day to sell in {region}. Demand is above average "
                  f"({demand:.0f} kg expected). Fair price: {price} KES/kg.")
    elif signal == "LOW":
        advice = (f"Demand is low in {region} today ({demand:.0f} kg expected). "
                  f"Consider waiting or trying a nearby market. Price: {price} KES/kg.")
    else:
        advice = (f"Normal demand in {region} ({demand:.0f} kg expected). "
                  f"Fair price today: {price} KES/kg.")

    return PriceResponse(
        region=region,
        predicted_price_kes_kg=price,
        price_lower=round(price - LSTM_RMSE, 2),
        price_upper=round(price + LSTM_RMSE, 2),
        demand_forecast_kg=demand,
        demand_low_kg=d_low,
        demand_high_kg=d_high,
        demand_signal=signal,
        advice=advice
    )

@app.get("/demand/{region}")
def demand_only(region: str):
    """Quick demand forecast for a region — no price window needed."""
    region = region.title()
    if region not in prophet_models:
        raise HTTPException(404, f"Region '{region}' not found.")
    m        = prophet_models[region]
    future   = m.make_future_dataframe(periods=7, freq='D')
    forecast = m.predict(future).tail(7)
    return {
        "region": region,
        "next_7_days": [
            {
                "date": str(row['ds'].date()),
                "demand_kg": max(0, round(row['yhat'], 1)),
                "low_kg":    max(0, round(row['yhat_lower'], 1)),
                "high_kg":   max(0, round(row['yhat_upper'], 1)),
            }
            for _, row in forecast.iterrows()
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "lstm_loaded": lstm_model is not None,
        "prophet_regions": sorted(prophet_models.keys())
    }

if __name__ == "__main__":
    print("API running at: http://127.0.0.1:8000")
    print("Docs at:        http://127.0.0.1:8000/docs")
    uvicorn.run("prophet_api:app", host="0.0.0.0", port=8000, reload=True)