import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
from tensorflow.keras.models import load_model, save_model # type: ignore
from tensorflow.keras.optimizers import Adam # type: ignore
import numpy as np
from consts import training_files_btc_pct


def train(ticker):

    X_train = np.load(f'{training_files_btc_pct}/X_train_{ticker}.npy')
    y_train = np.load(f'{training_files_btc_pct}/y_train_{ticker}.npy')

    scale = 5000
    y_train = y_train * scale

    model = load_model(f"{training_files_btc_pct}/model_{ticker}.keras", compile=False)
    model.compile(optimizer=Adam(learning_rate=1e-5), loss="mse")

    model.fit(X_train, y_train, epochs=2, batch_size=2, shuffle=False, verbose=0)

    model_path = f"{training_files_btc_pct}/model_{ticker}.keras"
    save_model(model, model_path)

