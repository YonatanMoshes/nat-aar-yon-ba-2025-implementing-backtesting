import numpy as np
import joblib
from btc.training_data import create_input
from btc.create_indicators import calculate_indicators
from btc.save_preds import save_predictions
import pandas as pd
import sys
from consts import training_files_btc

def test_main(ticker, num_preds) :
    num_preds = int(num_preds)

    thresholds = [0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52, 0.53, 0.54]

    df = pd.read_csv(f'{training_files_btc}/{ticker}_24k.csv')
    df = df.dropna()
    df_with_indicators = calculate_indicators(df)

    create_input(df_with_indicators, ticker , num_preds, False)

    model = joblib.load(f'{training_files_btc}/model_{ticker}.pkl')
    X_test = np.load(f"{training_files_btc}/X_train_{ticker}.npy")
    X_test = X_test.reshape(X_test.shape[0], -1)

    y_pred = []
    y_proba = model.predict_proba(X_test)
    for threshold in thresholds:
        y_pred.append((y_proba[:, 1] > threshold).astype(int))

    save_predictions(y_pred, ticker)
    #print(f"updated mongo with {len(y_pred[0])} predictions")






