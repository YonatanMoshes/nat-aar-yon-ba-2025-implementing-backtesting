import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
from tensorflow.keras.models import Sequential, save_model  # type: ignore
from tensorflow.keras.layers import (
    LSTM,
    Dense,
    Dropout,
    BatchNormalization,
    Bidirectional,
)  # type: ignore
from tensorflow.keras.callbacks import EarlyStopping  # type: ignore
from tensorflow.keras.optimizers import Adam  # type: ignore
from tensorflow.keras.regularizers import l2  # type: ignore
from tensorflow.keras import Input  # type: ignore
import numpy as np
from consts import training_files_btc_pct



def init_train(ticker):
    """Initial training routine for the LSTM model.

    Loads pre-generated training arrays, builds a more expressive LSTM
    architecture and trains it with basic regularisation and early
    stopping.  The goal of these changes is to provide a stronger
    baseline that can more reliably reach a higher accuracy threshold
    (e.g. 60% success rate).
    """

    folder_path = training_files_btc_pct

    X_train = np.load(f"{folder_path}/X_train_{ticker}.npy")
    y_train = np.load(f"{folder_path}/y_train_{ticker}.npy")

    scale = 5000
    y_train = y_train * scale

    sequence_length = X_train.shape[1]
    num_features = X_train.shape[2]

    model = Sequential(
        [
            Input(shape=(sequence_length, num_features)),
            Bidirectional(
                LSTM(64, return_sequences=True, kernel_regularizer=l2(0.001))
            ),
            Dropout(0.3),
            BatchNormalization(),
            Bidirectional(
                LSTM(32, return_sequences=False, kernel_regularizer=l2(0.001))
            ),
            Dropout(0.3),
            Dense(32, activation="relu"),
            Dropout(0.2),
            Dense(1),
        ]
    )

    model.compile(optimizer=Adam(learning_rate=1e-3), loss="mse")

    callbacks = [EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True)]

    model.fit(
        X_train,
        y_train,
        epochs=100,
        batch_size=64,
        validation_split=0.1,
        callbacks=callbacks,
        verbose=1,
        shuffle=False,
    )

    model_path = f"{folder_path}/model_{ticker}.keras"
    save_model(model, model_path)
