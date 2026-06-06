import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from tensorflow.keras.models import load_model
import uvicorn

# ── Load model + scaler once at startup ───────────────────────────────────
print("Loading model and scaler...")
model  = load_model('models/best_lstm.keras')
scaler = joblib.load('models/scaler.pkl')
le     = joblib.load('models/label_encoder.pkl')
print("Ready.")

app = FastAPI(
    title="Maize Price Prediction API",
    description="LSTM model predicting fair maize prices across Kenyan regions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ──────────────────────────────────────────────
class PriceRequest(BaseModel):
    window: List[List[float]]  # shape: 14 x 7
    region_name: str = "Nakuru"

class PriceResponse(BaseModel):
    predicted_price_kes_kg: float
    lower_bound: float
    upper_bound: float
    region: str
    message: str

# ── Helper ─────────────────────────────────────────────────────────────────
def inverse_price(scaled_val: float) -> float:
    dummy = np.zeros((1, 7))
    dummy[0, 0] = scaled_val
    return round(float(scaler.inverse_transform(dummy)[0, 0]), 2)

RMSE = 4.5  # update with your actual RMSE from evaluate.py

# ── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status":  "running",
        "model":   "LSTM maize price predictor",
        "regions": list(le.classes_),
        "usage":   "POST to /predict with a 14-day window"
    }

@app.get("/regions")
def get_regions():
    return {
        "regions": [
            {"name": r, "code": int(le.transform([r])[0])}
            for r in le.classes_
        ]
    }

@app.post("/predict", response_model=PriceResponse)
def predict(req: PriceRequest):
    if len(req.window) != 14:
        raise HTTPException(status_code=400,
            detail=f"Window must be 14 days. Got {len(req.window)}.")
    if any(len(row) != 7 for row in req.window):
        raise HTTPException(status_code=400,
            detail="Each day needs exactly 7 features.")

    raw    = np.array(req.window)
    scaled = scaler.transform(raw)
    X      = scaled.reshape(1, 14, 7)

    pred_scaled = model.predict(X, verbose=0)[0, 0]
    price       = inverse_price(pred_scaled)

    return PriceResponse(
        predicted_price_kes_kg=price,
        lower_bound=round(price - RMSE, 2),
        upper_bound=round(price + RMSE, 2),
        region=req.region_name,
        message=f"Fair price for maize in {req.region_name} tomorrow: {price} KES/kg"
    )

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)