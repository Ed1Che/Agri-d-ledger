import os
import io
import numpy as np
import pandas as pd
import joblib
import glob
import warnings
warnings.filterwarnings('ignore')

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import uvicorn

# ── Load all 4 models ──────────────────────────────────────────────────────
print("Loading all models...")

lstm_model  = load_model('models/best_lstm.keras')
lstm_scaler = joblib.load('models/scaler.pkl')
lstm_le     = joblib.load('models/label_encoder.pkl')

prophet_models = {}
for path in glob.glob('models/prophet/*_prophet.pkl'):
    region = os.path.basename(path).replace('_prophet.pkl','').title()
    prophet_models[region] = joblib.load(path)

fraud_model     = joblib.load('models/fraud/isolation_forest.pkl')
fraud_scaler    = joblib.load('models/fraud/fraud_scaler.pkl')
fraud_threshold = joblib.load('models/fraud/score_threshold.pkl')
FRAUD_FEATURES  = joblib.load('models/fraud/feature_names.pkl')

quality_model = load_model('models/efficientnet_best.keras')
class_indices = joblib.load('models/class_indices.pkl')
idx_to_grade  = {v: k for k, v in class_indices.items()}
GRADE_LABELS  = {'A':'Fresh/Good','B':'Average','C':'Damaged/Poor'}
GRADE_ADVICE  = {
    'A': 'Premium quality — command full market price.',
    'B': 'Average quality — standard market price applies.',
    'C': 'Poor quality — price reduction expected. Consider drying or sorting.'
}

print(f"✓ LSTM, Prophet ({len(prophet_models)} regions), Isolation Forest, EfficientNet loaded.")

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Maize Market Intelligence API",
    description="Price · Demand · Quality · Fraud Detection — Full Pipeline",
    version="4.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

IMG_SIZE  = (224, 224)
LSTM_RMSE = 4.5

# ── Schemas ────────────────────────────────────────────────────────────────
class TransactionRequest(BaseModel):
    window: list[list[float]]        # 14 x 7
    region_name: str = "Nakuru"
    offered_price_kes_kg: float
    quantity_kg: float
    rainfall_mm: float = 15.0

class FraudOnlyRequest(BaseModel):
    region_name: str
    offered_price_kes_kg: float
    quantity_kg: float
    rainfall_mm: float = 15.0
    lag_7:  float = 0.0
    lag_14: float = 0.0

# ── Helpers ────────────────────────────────────────────────────────────────
def inverse_price(val):
    dummy = np.zeros((1, 7))
    dummy[0, 0] = float(val)
    return round(float(lstm_scaler.inverse_transform(dummy)[0, 0]), 2)

def check_fraud(region, offered_price, quantity, rainfall, lag7=0, lag14=0):
    df_hist    = pd.read_csv('data/nairobi_maize_prices_full.csv')
    region_avg = df_hist[df_hist['region']==region]['price_kes_per_kg'].mean()
    region_std = df_hist[df_hist['region']==region]['price_kes_per_kg'].std()
    qty_avg    = df_hist[df_hist['region']==region]['quantity_kg'].mean()
    qty_std    = df_hist[df_hist['region']==region]['quantity_kg'].std()
    le_fraud   = joblib.load('models/fraud/fraud_label_encoder.pkl')
    region_code = int(le_fraud.transform([region])[0]) if region in le_fraud.classes_ else 0
    price_dev   = (offered_price - region_avg) / max(region_std, 1)
    qty_dev     = (quantity - qty_avg)          / max(qty_std, 1)
    p_chg_7     = (offered_price - lag7)  / max(lag7,  1) if lag7  else 0
    p_chg_14    = (offered_price - lag14) / max(lag14, 1) if lag14 else 0
    rain_ratio  = rainfall / max(offered_price, 1)
    features    = np.array([[offered_price, quantity, rainfall, region_code,
                              price_dev, qty_dev, p_chg_7, p_chg_14, rain_ratio]])
    scaled  = fraud_scaler.transform(features)
    score   = float(fraud_model.decision_function(scaled)[0])
    flagged = score < fraud_threshold
    risk    = "HIGH" if score < fraud_threshold - 0.05 else "MEDIUM" if score < fraud_threshold else "LOW"
    return {"flagged": flagged, "anomaly_score": round(score, 4),
            "risk_level": risk, "regional_avg_price": round(region_avg, 2),
            "price_deviation_kes": round(offered_price - region_avg, 2)}

def get_demand(region):
    if region not in prophet_models: return None
    m      = prophet_models[region]
    future = m.make_future_dataframe(periods=1, freq='D')
    fc     = m.predict(future).iloc[-1]
    return {"demand_kg":      max(0, round(float(fc['yhat']), 1)),
            "demand_low_kg":  max(0, round(float(fc['yhat_lower']), 1)),
            "demand_high_kg": max(0, round(float(fc['yhat_upper']), 1))}

def grade_image_bytes(image_bytes: bytes) -> dict:
    img  = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize(IMG_SIZE)
    arr  = np.expand_dims(img_to_array(img) / 255.0, axis=0)
    probs = quality_model.predict(arr, verbose=0)[0]
    idx   = int(np.argmax(probs))
    grade = idx_to_grade[idx]
    return {"grade": grade, "label": GRADE_LABELS[grade],
            "confidence": round(float(probs[idx]) * 100, 1),
            "advice": GRADE_ADVICE[grade],
            "scores": {"A": round(float(probs[class_indices['A']])*100,1),
                       "B": round(float(probs[class_indices['B']])*100,1),
                       "C": round(float(probs[class_indices['C']])*100,1)}}

# ── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "running", "version": "4.0 — All 4 models active",
            "models": {"1_price":   "LSTM → fair KES/kg price",
                       "2_demand":  "Prophet → buyer demand forecast",
                       "3_quality": "EfficientNet → Grade A/B/C",
                       "4_fraud":   "Isolation Forest → fraud detection"},
            "regions": sorted(prophet_models.keys())}

@app.get("/regions")
def get_regions():
    return {"regions": [{"name": r,
            "lstm_code": int(lstm_le.transform([r])[0]) if r in lstm_le.classes_ else "n/a"}
            for r in sorted(prophet_models.keys())]}

@app.post("/predict")
def full_predict(req: TransactionRequest):
    """Full pipeline: LSTM price + Prophet demand + Isolation Forest fraud check."""
    region = req.region_name
    if len(req.window) != 14 or any(len(r) != 7 for r in req.window):
        raise HTTPException(400, "Window must be 14 rows x 7 features.")
    # LSTM
    scaled     = lstm_scaler.transform(np.array(req.window)).reshape(1, 14, 7)
    fair_price = inverse_price(lstm_model.predict(scaled, verbose=0)[0, 0])
    # Prophet
    demand = get_demand(region) or {"demand_kg":0,"demand_low_kg":0,"demand_high_kg":0}
    d_kg   = demand["demand_kg"]
    signal = "HIGH" if d_kg > 130 else "LOW" if d_kg < 90 else "NORMAL"
    # Fraud
    fraud = check_fraud(region, req.offered_price_kes_kg,
                        req.quantity_kg, req.rainfall_mm)
    fraud_warning = " FRAUD ALERT: This offer looks suspicious." if fraud["flagged"] else ""
    verdict = "ACCEPT" if req.offered_price_kes_kg >= fair_price - LSTM_RMSE else "NEGOTIATE"
    advice  = (f"Fair price in {region}: {fair_price} KES/kg. "
               f"Buyer offering {req.offered_price_kes_kg} KES/kg — {verdict}. "
               f"Demand today: {signal} ({d_kg:.0f} kg expected).{fraud_warning}")
    return {"region": region,
            "price":  {"fair_price_kes_kg": fair_price,
                       "offered_price_kes_kg": req.offered_price_kes_kg,
                       "lower_bound": round(fair_price - LSTM_RMSE, 2),
                       "upper_bound": round(fair_price + LSTM_RMSE, 2),
                       "verdict": verdict},
            "demand": {**demand, "signal": signal},
            "fraud":  fraud,
            "advice": advice}

@app.post("/check-fraud")
def fraud_only(req: FraudOnlyRequest):
    """Quick fraud check — no 14-day window needed."""
    region = req.region_name.title()
    if region not in prophet_models:
        raise HTTPException(404, f"Region '{region}' not found.")
    result = check_fraud(region, req.offered_price_kes_kg,
                         req.quantity_kg, req.rainfall_mm,
                         req.lag_7, req.lag_14)
    result["region"]         = region
    result["offered_price"]  = req.offered_price_kes_kg
    result["quantity_kg"]    = req.quantity_kg
    return result

@app.post("/grade-image")
async def grade_image_endpoint(file: UploadFile = File(...)):
    """Upload a maize photo → Grade A / B / C with confidence score."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "File must be an image (JPG/PNG/WEBP).")
    contents = await file.read()
    result   = grade_image_bytes(contents)
    return {"filename": file.filename, **result}

@app.get("/demand/{region}")
def demand_only(region: str):
    """7-day demand forecast for a region."""
    region = region.title()
    if region not in prophet_models:
        raise HTTPException(404, f"Region '{region}' not found.")
    m      = prophet_models[region]
    future = m.make_future_dataframe(periods=7, freq='D')
    fc     = m.predict(future).tail(7)
    return {"region": region, "next_7_days": [
        {"date": str(r['ds'].date()),
         "demand_kg":      max(0, round(r['yhat'], 1)),
         "demand_low_kg":  max(0, round(r['yhat_lower'], 1)),
         "demand_high_kg": max(0, round(r['yhat_upper'], 1))}
        for _, r in fc.iterrows()]}

@app.get("/health")
def health():
    return {"status": "healthy",
            "lstm":    lstm_model    is not None,
            "prophet": sorted(prophet_models.keys()),
            "fraud":   fraud_model   is not None,
            "quality": quality_model is not None}

if __name__ == "__main__":
    print("API: http://127.0.0.1:8000")
    print("Docs: http://127.0.0.1:8000/docs")
    uvicorn.run("efficientnet_api:app", host="0.0.0.0", port=8000, reload=True)