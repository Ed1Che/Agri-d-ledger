import os
import numpy as np
import joblib
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.models import Model
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.preprocessing.image import ImageDataGenerator

os.makedirs('models', exist_ok=True)

TRAIN_DIR = 'data/maize_images/train'
VAL_DIR   = 'data/maize_images/val'
GRADES    = ['A', 'B', 'C']
IMG_SIZE  = (224, 224)
BATCH     = 8

print("=" * 55)
print("  EFFICIENTNET — STEP 1: LOADING BASE MODEL")
print("=" * 55)
print("""
  Using EfficientNetB0 — pre-trained on ImageNet
  (1.2 million images, 1000 categories).

  Transfer learning strategy:
  Phase 1 — FREEZE the EfficientNet base layers
             Only train our new top layers (20 epochs)
             This teaches the classifier without
             destroying pre-trained features.

  Phase 2 — UNFREEZE top 20 layers of EfficientNet
             Fine-tune with a very low learning rate
             This adapts the features to maize images.
""")

# ── Data generators ────────────────────────────────────────────────────────
train_gen = ImageDataGenerator(
    rescale=1./255, horizontal_flip=True, rotation_range=15,
    zoom_range=0.10, brightness_range=[0.85,1.15],
    width_shift_range=0.10, height_shift_range=0.10, fill_mode='nearest'
).flow_from_directory(TRAIN_DIR, target_size=IMG_SIZE, batch_size=BATCH,
                      class_mode='categorical', classes=GRADES, shuffle=True)

val_gen = ImageDataGenerator(rescale=1./255).flow_from_directory(
    VAL_DIR, target_size=IMG_SIZE, batch_size=BATCH,
    class_mode='categorical', classes=GRADES, shuffle=False)

# ── Build model ────────────────────────────────────────────────────────────
print("=" * 55)
print("  EFFICIENTNET — STEP 2: BUILDING MODEL")
print("=" * 55)

base = EfficientNetB0(
    weights='imagenet',
    include_top=False,           # remove ImageNet classifier
    input_shape=(224, 224, 3)
)
base.trainable = False           # freeze base for phase 1
print(f"  Base model layers : {len(base.layers)}")
print(f"  Base frozen       : Yes (phase 1)")

# Add our custom classification head
x = base.output
x = GlobalAveragePooling2D()(x)
x = BatchNormalization()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.4)(x)
x = Dense(64,  activation='relu')(x)
x = Dropout(0.3)(x)
output = Dense(3, activation='softmax')(x)   # 3 grades: A, B, C

model = Model(inputs=base.input, outputs=output)
model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
print(f"  Total params      : {model.count_params():,}")
print(f"  Trainable params  : {sum([p.numpy().size for p in model.trainable_weights]):,}")

# ── PHASE 1: Train top layers only ────────────────────────────────────────
print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 3: PHASE 1 TRAINING (frozen base)")
print("=" * 55)

callbacks_p1 = [
    EarlyStopping(monitor='val_accuracy', patience=8,
                  restore_best_weights=True, verbose=1),
    ModelCheckpoint('models/efficientnet_phase1.keras',
                    monitor='val_accuracy', save_best_only=True, verbose=0),
]

history1 = model.fit(
    train_gen, epochs=20, validation_data=val_gen,
    callbacks=callbacks_p1, verbose=1
)

best_p1_acc = max(history1.history['val_accuracy'])
print(f"\n  Phase 1 best val_accuracy: {best_p1_acc:.4f} ({best_p1_acc*100:.1f}%)")

# ── PHASE 2: Fine-tune top layers of base ─────────────────────────────────
print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 4: PHASE 2 FINE-TUNING")
print("=" * 55)

# Unfreeze top 20 layers of EfficientNet
base.trainable = True
for layer in base.layers[:-20]:
    layer.trainable = False

unfrozen = sum(1 for l in base.layers if l.trainable)
print(f"  Unfrozen base layers : {unfrozen} (top 20)")

model.compile(
    optimizer=Adam(learning_rate=0.0001),   # 10x lower LR for fine-tuning
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p2 = [
    EarlyStopping(monitor='val_accuracy', patience=10,
                  restore_best_weights=True, verbose=1),
    ModelCheckpoint('models/efficientnet_best.keras',
                    monitor='val_accuracy', save_best_only=True, verbose=0),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                      patience=5, min_lr=1e-7, verbose=1),
]

history2 = model.fit(
    train_gen, epochs=30, validation_data=val_gen,
    callbacks=callbacks_p2, verbose=1
)

best_p2_acc = max(history2.history['val_accuracy'])
print(f"\n  Phase 2 best val_accuracy: {best_p2_acc:.4f} ({best_p2_acc*100:.1f}%)")

# ── Save ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 5: SAVING")
print("=" * 55)

model.save('models/efficientnet_maize.keras')
print("  Saved: models/efficientnet_maize.keras")
print("  Saved: models/efficientnet_best.keras  (best checkpoint)")

print(f"\n  Phase 1 accuracy : {best_p1_acc*100:.1f}%")
print(f"  Phase 2 accuracy : {best_p2_acc*100:.1f}%")
print(f"  Final accuracy   : {max(best_p1_acc, best_p2_acc)*100:.1f}%")
print("\n  ✓ Training complete. Run 15_efficientnet_evaluate.py next.")