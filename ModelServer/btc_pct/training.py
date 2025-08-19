 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/ModelServer/btc_pct/training.py b/ModelServer/btc_pct/training.py
index c77e78bab29e7df5fad126dae585e5d55834b822..81c4cf3d7239ece7b00b584047ef7693fdc4359d 100644
--- a/ModelServer/btc_pct/training.py
+++ b/ModelServer/btc_pct/training.py
@@ -1,24 +1,45 @@
 import os
 os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
-from tensorflow.keras.models import load_model, save_model # type: ignore
-from tensorflow.keras.optimizers import Adam # type: ignore
+from tensorflow.keras.models import load_model, save_model  # type: ignore
+from tensorflow.keras.optimizers import Adam  # type: ignore
+from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau  # type: ignore
 import numpy as np
 from consts import training_files_btc_pct
 
 
-def train(ticker):
+def train(ticker, epochs: int = 50, batch_size: int = 32) -> None:
+    """Fine‑tune an existing model on additional data.
 
-    X_train = np.load(f'{training_files_btc_pct}/X_train_{ticker}.npy')
-    y_train = np.load(f'{training_files_btc_pct}/y_train_{ticker}.npy')
+    Adds early stopping and learning‑rate scheduling to stabilise
+    training.  The defaults are deliberately small so the function can
+    be invoked quickly for experimentation while still allowing longer
+    runs when needed.
+    """
+
+    X_train = np.load(f"{training_files_btc_pct}/X_train_{ticker}.npy")
+    y_train = np.load(f"{training_files_btc_pct}/y_train_{ticker}.npy")
 
     scale = 5000
     y_train = y_train * scale
 
     model = load_model(f"{training_files_btc_pct}/model_{ticker}.keras", compile=False)
-    model.compile(optimizer=Adam(learning_rate=1e-5), loss="mse")
-
-    model.fit(X_train, y_train, epochs=2, batch_size=2, shuffle=False, verbose=0)
+    model.compile(optimizer=Adam(learning_rate=1e-4), loss="mse")
+
+    callbacks = [
+        EarlyStopping(monitor="loss", patience=5, restore_best_weights=True),
+        ReduceLROnPlateau(monitor="loss", factor=0.5, patience=3, min_lr=1e-6),
+    ]
+
+    model.fit(
+        X_train,
+        y_train,
+        epochs=epochs,
+        batch_size=batch_size,
+        shuffle=False,
+        verbose=0,
+        callbacks=callbacks,
+    )
 
     model_path = f"{training_files_btc_pct}/model_{ticker}.keras"
     save_model(model, model_path)
 
 
EOF
)
