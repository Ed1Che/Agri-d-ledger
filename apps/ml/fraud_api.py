import numpy as np
import pandas as pd
import joblib
import glob
import os
import warnings
warnings.filterwarnings('ignore')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tensorflow.keras.models import load_model
import uvicorn

# ── Load all models ────────────────────────────────────────────────────────
print("Loading all models...")

# LSTM (price)
lstm_model   = load_model('models/best_lstm.keras')
lstm_scaler  = joblib.load('models/scaler.pkl')
lstm_le      = joblib.load('models/label_encoder.pkl')

# Prophet (demand)
prophet_models = {}
for path in glob.glob('models/prophet/*_prophet.pkl'):
    region = os.path.basename(path).replace('_prophet.pkl','').title()
    prophet_models[region] = joblib.load(path)

# Isolation Forest (fraud)
fraud_model     = joblib.load('models/fraud/isolation_forest.pkl')
fraud_scaler    = joblib.load('models/fraud/fraud_scaler.pkl')
fraud_threshold = joblib.load('models/fraud/score_threshold.pkl')
FRAUD_FEATURES  = joblib.load('models/fraud/feature_names.pkl')

print(f"✓ LSTM loaded")
print(f"✓ Prophet loaded for {len(prophet_models)} regions")
print(f"✓ Isolation Forest loaded  (threshold={fraud_threshold:.4f})")
print("All models ready.\n")

app = FastAPI(
    title="Maize Market Intelligence API",
    description="Price (LSTM) + Demand (Prophet) + Fraud Detection (Isolation Forest)",
    version="3.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Schemas ────────────────────────────────────────────────────────────────
class TransactionRequest(BaseModel):
    # LSTM price window
    window: list[list[float]]       # 14 x 7
    region_name: str = "Nakuru"
    # Transaction details for fraud check
    offered_price_kes_kg: float     # price buyer is offering
    quantity_kg: float              # quantity in this transaction
    rainfall_mm: float = 15.0

class FraudOnlyRequest(BaseModel):
    region_name: str
    offered_price_kes_kg: float
    quantity_kg: float
    rainfall_mm: float = 15.0
    lag_7: float  = 0.0
    lag_14: float = 0.0

LSTM_RMSE = 4.5

# ── Helpers ────────────────────────────────────────────────────────────────
def inverse_price(val):
    dummy = np.zeros((1, 7))
    dummy[0, 0] = float(val)
    return round(float(lstm_scaler.inverse_transform(dummy)[0, 0]), 2)

def check_fraud(region, offered_price, quantity, rainfall, lag7=0, lag14=0):
    """Run Isolation Forest on a single transaction."""
    df_hist = pd.read_csv('data/nairobi_maize_prices_full.csv')
    region_avg = df_hist[df_hist['region']==region]['price_kes_per_kg'].mean()
    region_std = df_hist[df_hist['region']==region]['price_kes_per_kg'].std()
    qty_avg    = df_hist[df_hist['region']==region]['quantity_kg'].mean()
    qty_std    = df_hist[df_hist['region']==region]['quantity_kg'].std()

    le = joblib.load('models/fraud/fraud_label_encoder.pkl')
    region_code = int(le.transform([region])[0]) if region in le.classes_ else 0

    price_dev   = (offered_price - region_avg) / max(region_std, 1)
    qty_dev     = (quantity - qty_avg) / max(qty_std, 1)
    p_chg_7     = (offered_price - lag7)  / max(lag7, 1)  if lag7  else 0
    p_chg_14    = (offered_price - lag14) / max(lag14, 1) if lag14 else 0
    rain_ratio  = rainfall / max(offered_price, 1)

    features = np.array([[
        offered_price, quantity, rainfall, region_code,
        price_dev, qty_dev, p_chg_7, p_chg_14, rain_ratio
    ]])
    features_scaled = fraud_scaler.transform(features)
    score = float(fraud_model.decision_function(features_scaled)[0])
    flagged = score < fraud_threshold

    if score < fraud_threshold - 0.05:  risk = "HIGH"
    elif score < fraud_threshold:        risk = "MEDIUM"
    else:                                risk = "LOW"

    return {
        "flagged": flagged,
        "anomaly_score": round(score, 4),
        "risk_level": risk,
        "regional_avg_price": round(region_avg, 2),
        "price_deviation_kes": round(offered_price - region_avg, 2),
    }

def get_demand(region):
    if region not in prophet_models: return None
    m      = prophet_models[region]
    future = m.make_future_dataframe(periods=1, freq='D')
    fc     = m.predict(future).iloc[-1]
    return {
        "demand_kg":      max(0, round(float(fc['yhat']), 1)),
        "demand_low_kg":  max(0, round(float(fc['yhat_lower']), 1)),
        "demand_high_kg": max(0, round(float(fc['yhat_upper']), 1)),
    }

# ── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "running",
        "version": "3.0 — LSTM + Prophet + Isolation Forest",
        "models": {
            "price":  "LSTM (predicts fair price)",
            "demand": "Prophet (forecasts buyer demand)",
            "fraud":  "Isolation Forest (flags suspicious transactions)"
        },
        "regions": sorted(prophet_models.keys()),
    }

@app.post("/predict")
def full_predict(req: TransactionRequest):
    """
    Full pipeline prediction:
    1. LSTM  → fair price
    2. Prophet → demand forecast
    3. Isolation Forest → fraud check on offered price
    """
    region = req.region_name

    # 1. LSTM price
    if len(req.window) != 14 or any(len(r) != 7 for r in req.window):
        raise HTTPException(400, "Window must be 14 rows × 7 features.")
    raw    = np.array(req.window)
    scaled = lstm_scaler.transform(raw).reshape(1, 14, 7)
    fair_price = inverse_price(lstm_model.predict(scaled, verbose=0)[0, 0])

    # 2. Prophet demand
    demand = get_demand(region) or {"demand_kg": 0, "demand_low_kg": 0, "demand_high_kg": 0}
    d_kg   = demand["demand_kg"]
    signal = "HIGH" if d_kg > 130 else "LOW" if d_kg < 90 else "NORMAL"

    # 3. Fraud check
    fraud = check_fraud(region, req.offered_price_kes_kg,
                        req.quantity_kg, req.rainfall_mm)

    # 4. Farmer advice
    fraud_warning = " ⚠️ FRAUD ALERT: This offer looks suspicious." if fraud["flagged"] else ""
    advice = (f"Fair price in {region}: {fair_price} KES/kg. "
              f"Buyer offering: {req.offered_price_kes_kg} KES/kg "
              f"({'ACCEPT' if req.offered_price_kes_kg >= fair_price - LSTM_RMSE else 'NEGOTIATE'})."
              f" Demand today: {signal} ({d_kg:.0f} kg expected).{fraud_warning}")

    return {
        "region": region,
        "price": {
            "fair_price_kes_kg":    fair_price,
            "offered_price_kes_kg": req.offered_price_kes_kg,
            "lower_bound":          round(fair_price - LSTM_RMSE, 2),
            "upper_bound":          round(fair_price + LSTM_RMSE, 2),
            "verdict": "ACCEPT" if req.offered_price_kes_kg >= fair_price - LSTM_RMSE else "NEGOTIATE",
        },
        "demand": {**demand, "signal": signal},
        "fraud":  fraud,
        "advice": advice,
    }

@app.post("/check-fraud")
def fraud_only(req: FraudOnlyRequest):
    """Quick fraud check on a single transaction — no price window needed."""
    region = req.region_name.title()
    if region not in prophet_models:
        raise HTTPException(404, f"Region '{region}' not found.")
    result = check_fraud(region, req.offered_price_kes_kg,
                         req.quantity_kg, req.rainfall_mm,
                         req.lag_7, req.lag_14)
    result["region"] = region
    result["offered_price"] = req.offered_price_kes_kg
    result["quantity_kg"]   = req.quantity_kg
    return result

@app.get("/demand/{region}")
def demand_only(region: str):
    region = region.title()
    if region not in prophet_models:
        raise HTTPException(404, f"Region '{region}' not found.")
    m      = prophet_models[region]
    future = m.make_future_dataframe(periods=7, freq='D')
    fc     = m.predict(future).tail(7)
    return {"region": region, "next_7_days": [
        {"date": str(r['ds'].date()),
         "demand_kg":     max(0, round(r['yhat'], 1)),
         "demand_low_kg": max(0, round(r['yhat_lower'], 1)),
         "demand_high_kg":max(0, round(r['yhat_upper'], 1))}
        for _, r in fc.iterrows()
    ]}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "lstm": lstm_model is not None,
        "prophet_regions": sorted(prophet_models.keys()),
        "fraud_model": fraud_model is not None,
        "fraud_threshold": fraud_threshold,
    }

if __name__ == "__main__":
    print("API: http://127.0.0.1:8000")
    print("Docs: http://127.0.0.1:8000/docs")
    uvicorn.run("12_fraud_api:app", host="0.0.0.0", port=8000, reload=True)