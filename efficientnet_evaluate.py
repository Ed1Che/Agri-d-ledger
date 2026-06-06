import os
import numpy as np
import matplotlib.pyplot as plt
import joblib
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

os.makedirs('outputs', exist_ok=True)

GRADES   = ['A', 'B', 'C']
VAL_DIR  = 'data/maize_images/val'
IMG_SIZE = (224, 224)

print("=" * 55)
print("  EFFICIENTNET — STEP 1: LOADING MODEL")
print("=" * 55)

model         = load_model('models/efficientnet_best.keras')
class_indices = joblib.load('models/class_indices.pkl')
idx_to_class  = {v: k for k, v in class_indices.items()}
print(f"  Model loaded : models/efficientnet_best.keras")
print(f"  Grade map    : {class_indices}")

print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 2: EVALUATING ON VAL SET")
print("=" * 55)

val_gen = ImageDataGenerator(rescale=1./255).flow_from_directory(
    VAL_DIR, target_size=IMG_SIZE, batch_size=8,
    class_mode='categorical', classes=GRADES, shuffle=False
)

loss, acc = model.evaluate(val_gen, verbose=0)
print(f"  Val loss     : {loss:.4f}")
print(f"  Val accuracy : {acc:.4f} ({acc*100:.1f}%)")

# Per-class predictions
y_pred_prob = model.predict(val_gen, verbose=0)
y_pred      = np.argmax(y_pred_prob, axis=1)
y_true      = val_gen.classes

print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 3: CLASSIFICATION REPORT")
print("=" * 55)
print(classification_report(y_true, y_pred, target_names=GRADES))

print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 4: SAMPLE PREDICTIONS")
print("=" * 55)
grade_labels = {0:'A — Fresh/Good', 1:'B — Average', 2:'C — Damaged/Poor'}
print(f"\n  {'Image':<35} {'Actual':>8} {'Predicted':>12} {'Confidence':>12}")
print(f"  {'-'*68}")
for i, (true, pred, prob) in enumerate(zip(y_true[:15], y_pred[:15], y_pred_prob[:15])):
    fname = val_gen.filenames[i]
    conf  = prob[pred] * 100
    match = '✓' if true == pred else '✗'
    print(f"  {os.path.basename(fname):<35} {GRADES[true]:>8} "
          f"{GRADES[pred]:>12} {conf:>11.1f}%  {match}")

print("\n" + "=" * 55)
print("  EFFICIENTNET — STEP 5: SAVING CONFUSION MATRIX")
print("=" * 55)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=GRADES, yticklabels=GRADES, ax=axes[0])
axes[0].set_title('Confusion Matrix', fontsize=13, fontweight='bold')
axes[0].set_xlabel('Predicted Grade')
axes[0].set_ylabel('Actual Grade')

# Confidence distribution
for i, grade in enumerate(GRADES):
    confs = y_pred_prob[y_true == i, i] * 100
    axes[1].hist(confs, bins=10, alpha=0.6,
                 label=f'Grade {grade}',
                 color=['#1D9E75','#BA7517','#E24B4A'][i])
axes[1].set_title('Prediction Confidence by Grade', fontsize=13, fontweight='bold')
axes[1].set_xlabel('Confidence (%)')
axes[1].set_ylabel('Count')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.suptitle('EfficientNet Maize Quality Assessment — Evaluation',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('outputs/efficientnet_evaluation.png', dpi=130, bbox_inches='tight')
print("  Saved: outputs/efficientnet_evaluation.png")
print(f"\n  ✓ Evaluation complete. Final accuracy: {acc*100:.1f}%")
print("  ✓ Run 16_efficientnet_api.py to add quality grading to the API.")