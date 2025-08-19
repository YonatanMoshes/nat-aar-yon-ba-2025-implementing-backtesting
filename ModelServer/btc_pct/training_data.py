import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler
from sklearn.decomposition import PCA
import joblib
from consts import training_files_btc_pct

features = [
    'ret_lag_1',
    'volatility_5',
    'ATR_5',
    'RSI_5',
    'MACD_diff',
    'OBV',
    'volume_change_5',
    'BB_width_5',

]
sequence_length = 70

def create_sequences(data, seq_length, num_sequences, has_target=True):
    X, y = [], []

    for i in range(len(data)- num_sequences - seq_length + 1, len(data) - seq_length + 1):
        sequence_data = data[i: i + seq_length].copy()
        sequence_data["Sequence"] = i
        X.append(sequence_data)

        if has_target:
            target_value = data.iloc[i + seq_length - 1]["Target_pct"]
            target = pd.DataFrame({"Sequence": [i], "Target_pct": [target_value]})
            y.append(target)
        else:
            target_date = data.iloc[i + seq_length -1]["timestamp"]
            target_date_dataframe = pd.DataFrame({"Sequence": [i],  "timestamp": [target_date]})
            y.append(target_date_dataframe)

        if i % 10000 == 0:
            print(f"{i} iterations completed")

    X = pd.concat(X, axis=0)
    y = pd.concat(y, ignore_index=True)

    return X, y


def create_input(data, ticker, num_sequences, has_target=True):
    if has_target:
        scaler = RobustScaler()
        data[features] = scaler.fit_transform(data[features])
        joblib.dump(scaler, f'{training_files_btc_pct}/scaler_{ticker}.pkl')
    else:
        scaler = joblib.load(f'{training_files_btc_pct}/scaler_{ticker}.pkl')
        data[features] = scaler.transform(data[features])


    X_data, y_data = create_sequences(data, sequence_length, num_sequences, has_target)
    combined_data = X_data[features]

    if has_target:
        combined_target_data = y_data['Target_pct']
        y_array = np.array(combined_target_data.values.reshape(-1))
        np.save(f'{training_files_btc_pct}/y_train_{ticker}.npy', y_array)
    else:
        y_data.to_csv(f"{training_files_btc_pct}/timestamps_{ticker}.csv")

    X_array = np.array(combined_data.values.reshape(-1, sequence_length, len(features)))
    np.save(f'{training_files_btc_pct}/X_train_{ticker}.npy', X_array)

