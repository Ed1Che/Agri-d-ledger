import os
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import joblib

print("=" * 55)
print("  EFFICIENTNET — STEP 1: CHECKING YOUR IMAGE FOLDERS")
print("=" * 55)

TRAIN_DIR = 'data/maize_images/train'
VAL_DIR   = 'data/maize_images/val'
GRADES    = ['A', 'B', 'C']
IMG_SIZE  = (224, 224)
BATCH     = 8

print("\n  Your dataset:")
total_train = 0
total_val   = 0
for grade in GRADES:
    t = len(os.listdir(os.path.join(TRAIN_DIR, grade)))
    v = len(os.listdir(os.path.join(VAL_DIR,   grade)))
    total_train += t
    total_val   += v
    print(f"    Grade {grade} — train: {t}  val: {v}")
print(f"\n    Total train : {total_train}")
print(f"    Total val   : {total_val}")

print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 2: DATA AUGMENTATION SETUP")
print("=" * 55)
print("""
  With 30 images per grade we use augmentation to
  create more training variations automatically:
    • Random horizontal flip  (mirror the image)
    • Random rotation ±15°    (slight tilt)
    • Random zoom 10%         (slight zoom in/out)
    • Brightness shift        (different lighting)
    • Width/height shift 10%  (slight position change)
  This multiplies your effective dataset size ~5x.
""")

train_datagen = ImageDataGenerator(
    rescale=1./255,
    horizontal_flip=True,
    rotation_range=15,
    zoom_range=0.10,
    brightness_range=[0.85, 1.15],
    width_shift_range=0.10,
    height_shift_range=0.10,
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(rescale=1./255)

train_gen = train_datagen.flow_from_directory(
    TRAIN_DIR, target_size=IMG_SIZE, batch_size=BATCH,
    class_mode='categorical', classes=GRADES, shuffle=True
)

val_gen = val_datagen.flow_from_directory(
    VAL_DIR, target_size=IMG_SIZE, batch_size=BATCH,
    class_mode='categorical', classes=GRADES, shuffle=False
)

print(f"  Class mapping : {train_gen.class_indices}")
print(f"  Train batches : {len(train_gen)}")
print(f"  Val batches   : {len(val_gen)}")

os.makedirs('models', exist_ok=True)
joblib.dump(train_gen.class_indices, 'models/class_indices.pkl')
print("\n  Saved: models/class_indices.pkl")
print("  ✓ Preprocessing complete. Run 14_efficientnet_train.py next.")