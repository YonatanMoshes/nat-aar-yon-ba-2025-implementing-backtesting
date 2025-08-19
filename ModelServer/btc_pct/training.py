import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
from tensorflow.keras.models import load_model, save_model  # type: ignore
from tensorflow.keras.optimizers import Adam  # type: ignore
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau  # type: ignore
import numpy as np
from consts import training_files_btc_pct


def train(ticker, epochs: int = 50, batch_size: int = 32) -> None:
    """Fine‑tune an existing model on additional data.

    Adds early stopping and learning‑rate scheduling to stabilise
    training.  The defaults are deliberately small so the function can
    be invoked quickly for experimentation while still allowing longer
    runs when needed.
    """

    X_train = np.load(f"{training_files_btc_pct}/X_train_{ticker}.npy")
    y_train = np.load(f"{training_files_btc_pct}/y_train_{ticker}.npy")

    scale = 5000
    y_train = y_train * scale

    model = load_model(f"{training_files_btc_pct}/model_{ticker}.keras", compile=False)
    model.compile(optimizer=Adam(learning_rate=1e-4), loss="mse")

    callbacks = [
        EarlyStopping(monitor="loss", patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor="loss", factor=0.5, patience=3, min_lr=1e-6),
    ]

    model.fit(
        X_train,
        y_train,
        epochs=epochs,
        batch_size=batch_size,
        shuffle=False,
        verbose=0,
        callbacks=callbacks,
    )

    model_path = f"{training_files_btc_pct}/model_{ticker}.keras"
    save_model(model, model_path)

