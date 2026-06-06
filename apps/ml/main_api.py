"""
Consolidated ML API entry point.
Mounts sub-routers from each model module with graceful fallback when
model artefacts have not been trained yet.
Run:  uvicorn main_api:app --host 0.0.0.0 --port 8000 --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

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


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Minimal price endpoint (consumed by apps/api ML proxy) ───────────────────
class PriceInput(BaseModel):
    crop: str
    county: str
    weightKg: float
    gradeCode: str = "AB"


class PriceOutput(BaseModel):
    pricePerKg: float
    confidence: float
    model: str


BASE_PRICES: dict[str, float] = {
    "maize": 45.0,
    "coffee": 350.0,
    "tea": 120.0,
    "potatoes": 30.0,
    "beans": 80.0,
    "wheat": 55.0,
}

GRADE_MULT: dict[str, float] = {"AA": 1.2, "AB": 1.0, "PB": 0.85, "C": 0.7}


@app.post("/predict/price", response_model=PriceOutput)
def predict_price(body: PriceInput):
    # Try loading the trained LSTM model if artefacts exist
    model_path = os.path.join(os.path.dirname(__file__), "models", "best_lstm.keras")
    if os.path.exists(model_path):
        try:
            from predict_api import predict as lstm_predict, PriceRequest
            # Map simple request to LSTM window format (stub 14-day flat window)
            import numpy as np
            base = BASE_PRICES.get(body.crop.lower(), 60.0)
            window = [[base, 0, 0, 0, 0, 0, 0]] * 14
            result = lstm_predict(PriceRequest(window=window, region_name=body.county))
            return PriceOutput(
                pricePerKg=result.predicted_price_kes_kg,
                confidence=0.82,
                model="lstm-v1",
            )
        except Exception:
            pass  # fall through to rule-based stub

    base = BASE_PRICES.get(body.crop.lower(), 60.0)
    mult = GRADE_MULT.get(body.gradeCode, 1.0)
    return PriceOutput(pricePerKg=round(base * mult, 2), confidence=0.65, model="rule-based")


# ── Mount sub-apps if available ───────────────────────────────────────────────
for module_name, prefix in [
    ("fraud_api", "/fraud"),
    ("prophet_api", "/prophet"),
    ("efficientnet_api", "/quality"),
]:
    try:
        import importlib
        mod = importlib.import_module(module_name)
        if hasattr(mod, "app"):
            app.mount(prefix, mod.app)
    except Exception:
        pass
