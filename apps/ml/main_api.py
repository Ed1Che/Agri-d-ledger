"""
Consolidated ML API entry point.
Mounts sub-routers from each model module with graceful fallback when
model artefacts have not been trained yet.
Run:  uvicorn main_api:app --host 0.0.0.0 --port 8000 --reload
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import glob

app = FastAPI(
    title="Agri-D-Ledger ML Service",
    description="Price prediction, fraud detection, and crop quality models",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class PriceInput(BaseModel):
    crop: str
    county: str
    weightKg: float
    gradeCode: str = "AB"


class PriceOutput(BaseModel):
    pricePerKg: float
    confidence: float
    model: str


class FullPipelineRequest(BaseModel):
    window: list[list[float]]   # 14 x 7
    region_name: str = "Nakuru"
    offered_price_kes_kg: float
    quantity_kg: float
    rainfall_mm: float = 15.0


class FraudRequest(BaseModel):
    region_name: str
    offered_price_kes_kg: float
    quantity_kg: float
    rainfall_mm: float = 15.0
    lag_7: float = 0.0
    lag_14: float = 0.0


BASE_PRICES: dict[str, float] = {
    "maize": 45.0,
    "coffee": 350.0,
    "tea": 120.0,
    "potatoes": 30.0,
    "beans": 80.0,
    "wheat": 55.0,
}
GRADE_MULT: dict[str, float] = {"AA": 1.2, "AB": 1.0, "PB": 0.85, "C": 0.7}


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Regions ───────────────────────────────────────────────────────────────────
@app.get("/regions")
def get_regions():
    base_dir = os.path.dirname(__file__)
    prophet_paths = glob.glob(os.path.join(base_dir, "models/prophet/*_prophet.pkl"))
    if prophet_paths:
        regions = sorted(
            os.path.basename(p).replace("_prophet.pkl", "").title()
            for p in prophet_paths
        )
        return {"regions": regions}
    return {"regions": sorted(BASE_PRICES.keys())}


# ── Price: simple crop price with LSTM fallback → rule-based ─────────────────
@app.post("/predict/price", response_model=PriceOutput)
def predict_price(body: PriceInput):
    model_path = os.path.join(os.path.dirname(__file__), "models", "best_lstm.keras")
    if os.path.exists(model_path):
        try:
            import numpy as np
            from predict_api import predict as lstm_predict, PriceRequest
            base = BASE_PRICES.get(body.crop.lower(), 60.0)
            window = [[base, 0, 0, 0, 0, 0, 0]] * 14
            result = lstm_predict(PriceRequest(window=window, region_name=body.county))
            return PriceOutput(
                pricePerKg=result.predicted_price_kes_kg,
                confidence=0.82,
                model="lstm-v1",
            )
        except Exception:
            pass
    base = BASE_PRICES.get(body.crop.lower(), 60.0)
    mult = GRADE_MULT.get(body.gradeCode, 1.0)
    return PriceOutput(pricePerKg=round(base * mult, 2), confidence=0.65, model="rule-based")


# ── Full pipeline: LSTM price + Prophet demand + Isolation Forest fraud ───────
@app.post("/predict")
def full_predict(req: FullPipelineRequest):
    try:
        from efficientnet_api import full_predict as _fn, TransactionRequest
        return _fn(TransactionRequest(
            window=req.window,
            region_name=req.region_name,
            offered_price_kes_kg=req.offered_price_kes_kg,
            quantity_kg=req.quantity_kg,
            rainfall_mm=req.rainfall_mm,
        ))
    except Exception:
        raise HTTPException(503, "Full pipeline unavailable — run all training scripts first.")


# ── Fraud check ───────────────────────────────────────────────────────────────
@app.post("/predict/fraud")
def predict_fraud(req: FraudRequest):
    try:
        from efficientnet_api import fraud_only as _fn, FraudOnlyRequest
        return _fn(FraudOnlyRequest(
            region_name=req.region_name,
            offered_price_kes_kg=req.offered_price_kes_kg,
            quantity_kg=req.quantity_kg,
            rainfall_mm=req.rainfall_mm,
            lag_7=req.lag_7,
            lag_14=req.lag_14,
        ))
    except Exception:
        raise HTTPException(503, "Fraud model unavailable — run fraud_train.py first.")


# ── Quality: crop image grading (Grade A / B / C) ────────────────────────────
@app.post("/predict/quality")
async def predict_quality(file: UploadFile = File(...)):
    try:
        from efficientnet_api import grade_image_endpoint as _fn
        return await _fn(file)
    except Exception:
        raise HTTPException(503, "Quality model unavailable — run efficientnet_train.py first.")


# ── Demand forecast ───────────────────────────────────────────────────────────
@app.get("/predict/demand/{region}")
def predict_demand(region: str):
    try:
        from prophet_api import demand_only as _fn
        return _fn(region)
    except Exception:
        raise HTTPException(503, "Demand model unavailable — run prophet_train.py first.")


# ── Mount sub-apps if available ───────────────────────────────────────────────
for module_name, prefix in [
    ("predict_api",      "/price"),
    ("fraud_api",        "/fraud"),
    ("prophet_api",      "/prophet"),
    ("efficientnet_api", "/quality"),
]:
    try:
        import importlib
        mod = importlib.import_module(module_name)
        if hasattr(mod, "app"):
            app.mount(prefix, mod.app)
    except Exception:
        pass
