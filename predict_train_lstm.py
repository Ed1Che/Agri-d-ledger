import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import os

# Get the script directory and set paths relative to workspace root
script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_root = os.path.dirname(script_dir)
os.chdir(workspace_root)
os.makedirs('models', exist_ok=True)

print("=" * 50)
print("  STEP 1: LOADING PREPROCESSED DATA")
print("=" * 50)

X_train = np.load('models/X_train.npy')
X_test  = np.load('models/X_test.npy')
y_train = np.load('models/y_train.npy')
y_test  = np.load('models/y_test.npy')

print(f"  X_train : {X_train.shape}")
print(f"  X_test  : {X_test.shape}")
print(f"  y_train : {y_train.shape}")
print(f"  y_test  : {y_test.shape}")

WINDOW   = X_train.shape[1]   # 14
N_FEATURES = X_train.shape[2] # 7

print("\n" + "=" * 50)
print("  STEP 2: BUILDING THE LSTM MODEL")
print("=" * 50)

model = Sequential([
    # Layer 1: reads the 14-day window, passes sequence to layer 2
    LSTM(64, return_sequences=True,
         input_shape=(WINDOW, N_FEATURES)),
    Dropout(0.2),

    # Layer 2: distils sequence into single context vector
    LSTM(32, return_sequences=False),
    Dropout(0.2),

    # Output: single price prediction
    Dense(16, activation='relu'),
    Dense(1)
])

model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='mean_squared_error',
    metrics=['mae']
)

model.summary()

print("\n" + "=" * 50)
print("  STEP 3: TRAINING (50 EPOCHS)")
print("=" * 50)

# Stop early if val_loss stops improving for 10 epochs
early_stop = EarlyStopping(
    monitor='val_loss',
    patience=10,
    restore_best_weights=True,
    verbose=1
)

# Auto-save the best model during training
checkpoint = ModelCheckpoint(
    'models/best_lstm.keras',
    monitor='val_loss',
    save_best_only=True,
    verbose=0
)

history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=16,
    validation_split=0.15,
    callbacks=[early_stop, checkpoint],
    verbose=1
)

print("\n" + "=" * 50)
print("  STEP 4: SAVING FINAL MODEL")
print("=" * 50)

model.save('models/lstm_price_model.keras')
print("  Saved: models/lstm_price_model.keras")
print("  Saved: models/best_lstm.keras  (best val_loss checkpoint)")

best_epoch = np.argmin(history.history['val_loss']) + 1
best_val   = min(history.history['val_loss'])
print(f"\n  Best epoch     : {best_epoch}")
print(f"  Best val_loss  : {best_val:.5f}")
print(f"  Epochs trained : {len(history.history['loss'])}")
print("\n  ✓ Training complete. Run 03_evaluate.py next.")