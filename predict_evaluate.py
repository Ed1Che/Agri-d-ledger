import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
from tensorflow.keras.models import load_model
from sklearn.metrics import mean_absolute_error, mean_squared_error
import os

# Get the script directory and set paths relative to workspace root
script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_root = os.path.dirname(script_dir)
os.chdir(workspace_root)

# Create outputs directory if it doesn't exist
if not os.path.exists('outputs'):
    os.makedirs('outputs')
elif not os.path.isdir('outputs'):
    os.remove('outputs')
    os.makedirs('outputs')

print("=" * 50)
print("  STEP 1: LOADING MODEL + DATA")
print("=" * 50)

model  = load_model('models/best_lstm.keras')
scaler = joblib.load('models/scaler.pkl')

X_test  = np.load('models/X_test.npy')
y_test  = np.load('models/y_test.npy')

print(f"  Model loaded   : models/best_lstm.keras")
print(f"  X_test shape   : {X_test.shape}")

print("\n" + "=" * 50)
print("  STEP 2: MAKING PREDICTIONS")
print("=" * 50)

y_pred_scaled = model.predict(X_test)
print(f"  Predictions shape: {y_pred_scaled.shape}")

# Inverse-transform: rebuild a full feature matrix, put predictions
# in column 0 (price), then inverse_transform and extract column 0
def inverse_price(scaled_col, scaler, n_features=7):
    dummy = np.zeros((len(scaled_col), n_features))
    dummy[:, 0] = scaled_col.flatten()
    return scaler.inverse_transform(dummy)[:, 0]

y_pred  = inverse_price(y_pred_scaled, scaler)
y_actual = inverse_price(y_test, scaler)

print("\n" + "=" * 50)
print("  STEP 3: METRICS")
print("=" * 50)

mae  = mean_absolute_error(y_actual, y_pred)
rmse = np.sqrt(mean_squared_error(y_actual, y_pred))
mape = np.mean(np.abs((y_actual - y_pred) / y_actual)) * 100
avg_price = y_actual.mean()

print(f"  MAE   : {mae:.2f} KES/kg  ← average error per prediction")
print(f"  RMSE  : {rmse:.2f} KES/kg  ← penalises large errors more")
print(f"  MAPE  : {mape:.1f}%        ← % error relative to actual price")
print(f"  Avg actual price: {avg_price:.2f} KES/kg")
print(f"  Error as % of avg: {(mae/avg_price)*100:.1f}%")

print("\n" + "=" * 50)
print("  STEP 4: TOMORROW'S PRICE PREDICTION")
print("=" * 50)

# Use the last 14 days of test data to predict the next day
last_window = X_test[-1].reshape(1, X_test.shape[1], X_test.shape[2])
next_pred_scaled = model.predict(last_window, verbose=0)
next_price = inverse_price(next_pred_scaled, scaler)[0]

print(f"  Predicted next-day price : {next_price:.2f} KES/kg")
print(f"  Confidence interval (±RMSE): {next_price - rmse:.2f} – {next_price + rmse:.2f} KES/kg")

print("\n" + "=" * 50)
print("  STEP 5: SAVING CHARTS")
print("=" * 50)

# Chart 1: Actual vs Predicted
fig, axes = plt.subplots(2, 1, figsize=(12, 8))

days = range(len(y_actual))
axes[0].plot(days, y_actual, label='Actual price',    color='#185FA5', linewidth=2)
axes[0].plot(days, y_pred,   label='Predicted price', color='#E24B4A', linewidth=1.5, linestyle='--')
axes[0].fill_between(days,
    y_pred - rmse, y_pred + rmse,
    alpha=0.15, color='#E24B4A', label=f'±RMSE band ({rmse:.1f})')
axes[0].set_title('Actual vs Predicted Maize Price (Test Set)', fontsize=13, fontweight='bold')
axes[0].set_xlabel('Test day')
axes[0].set_ylabel('Price (KES/kg)')
axes[0].legend()
axes[0].grid(alpha=0.3)

# Chart 2: Prediction error per day
errors = y_pred - y_actual
axes[1].bar(days, errors,
    color=['#E24B4A' if e > 0 else '#1D9E75' for e in errors],
    alpha=0.8)
axes[1].axhline(0, color='black', linewidth=0.8)
axes[1].axhline( mae, color='orange', linewidth=1, linestyle='--', label=f'MAE = {mae:.2f}')
axes[1].axhline(-mae, color='orange', linewidth=1, linestyle='--')
axes[1].set_title('Prediction Error per Day (positive = over-predicted)', fontsize=12)
axes[1].set_xlabel('Test day')
axes[1].set_ylabel('Error (KES/kg)')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('outputs/predictions_chart.png', dpi=150)
print("  Saved: outputs/predictions_chart.png")

# Save predictions to CSV
results = pd.DataFrame({
    'actual_price_kes': np.round(y_actual, 2),
    'predicted_price_kes': np.round(y_pred, 2),
    'error_kes': np.round(y_pred - y_actual, 2),
})
results.to_csv('outputs/predictions.csv', index=False)
print("  Saved: outputs/predictions.csv")

print(f"\n  ✓ Evaluation complete.")
print(f"  ✓ Tomorrow's predicted price: {next_price:.2f} KES/kg")
print(f"\n  Run 04_api.py next to serve predictions via HTTP.")