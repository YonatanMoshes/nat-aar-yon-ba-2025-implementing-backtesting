import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import numpy as np
from btc_pct.training_data import create_input
from btc_pct.create_indicators import calculate_indicators
from btc_pct.save_preds import save_predictions
from tensorflow.keras.models import load_model # type: ignore
import pandas as pd
import sys
import os
from consts import training_files_btc_pct

def test_main(ticker, num_preds) :
    #ticker = sys.argv[1]
    #num_preds = int(sys.argv[2])
    num_preds = int(num_preds)

    scale = 5000

    df = pd.read_csv(f'{training_files_btc_pct}/{ticker}_24k.csv')
    df_with_indicators = calculate_indicators(df)

    create_input(df_with_indicators, ticker , num_preds, False)

    model = load_model(f"{training_files_btc_pct}/model_{ticker}.keras", compile=False)
    X_test = np.load(f"{training_files_btc_pct}/X_train_{ticker}.npy")


    y_pred = (np.expm1(model.predict(X_test, verbose=0)/ scale)).reshape(-1)
    y_pred= [float(val) for val in y_pred]

    save_predictions(y_pred, ticker)
