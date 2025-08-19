import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
from tensorflow.keras.models import Sequential, save_model # type: ignore
from tensorflow.keras.layers import LSTM, Dense, Dropout # type: ignore
from tensorflow.keras.regularizers import l2 # type: ignore
from tensorflow.keras import Input # type: ignore
import numpy as np



def init_train(ticker):
    folder_path = "/Users/aaron/btc_pct/training_files"

    X_train = np.load(f'{folder_path}/X_train_{ticker}.npy')
    y_train = np.load(f'{folder_path}/y_train_{ticker}.npy')
    print(X_train.shape)

    scale = 5000
    sequence_length = 70
    num_features = 8
    y_train = y_train * scale

                
    model = Sequential([
        Input(shape=(sequence_length, num_features)),
        LSTM(50, return_sequences=True, kernel_regularizer=l2(0.1)),
        Dropout(0.2),
        LSTM(50, return_sequences=False, kernel_regularizer=l2(0.1)),
        Dropout(0.2),
        Dense(1)
    ])

    model.compile(optimizer='adam', loss='mse')

    model.fit(
        X_train, y_train,
        epochs=100,
        batch_size=256,
        validation_data=(X_train[:12], y_train[:12]),
        verbose=1,
        shuffle=False
        )


    model_path = f"{folder_path}/model_{ticker}.keras"
    save_model(model, model_path)
