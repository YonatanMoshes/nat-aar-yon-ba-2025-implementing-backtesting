import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler
from sklearn.decomposition import PCA
import joblib
from consts import training_files_btc

features = [
    'taker_buy_ratio', 'volume_zscore_12', 'ret_1',
    'RSI_6', 'MACD_hist', 'ATR_6',
    'price_volume_divergence', 'oversold_score',
    'BB_width_6', 
    'EMA_ratio_short', 'OBV', 'volatility_20'
]

sequence_length = 70

def create_sequences(data, seq_length, num_sequences, has_target=True):
    X, y = [], []

    for i in range(len(data)- num_sequences - seq_length + 1, len(data) - seq_length + 1):
        sequence_data = data[i: i + seq_length].copy()
        sequence_data["Sequence"] = i
        X.append(sequence_data)

        if has_target:
            target_value = data.iloc[i + seq_length - 1]["Target"]
            target = pd.DataFrame({"Sequence": [i], "Target": [target_value]})
            y.append(target)
        else:
            target_date = data.iloc[i + seq_length -1]["timestamp"]
            target_date_dataframe = pd.DataFrame({"Sequence": [i],  "timestamp": [target_date]})
            y.append(target_date_dataframe)


    X = pd.concat(X, axis=0)
    y = pd.concat(y, ignore_index=True)

    return X, y



         
def create_input(data, ticker, num_sequences, has_target=True):
    if has_target:
        scaler = RobustScaler()
        scaled = scaler.fit_transform(data[features])
        joblib.dump(scaler, f'{training_files_btc}/scaler_{ticker}.pkl')

        pca = PCA(n_components=3)
        pca_data = pca.fit_transform(scaled)
        joblib.dump(pca, f'{training_files_btc}/pca_{ticker}.pkl')
    else:
        scaler = joblib.load(f'{training_files_btc}/scaler_{ticker}.pkl')
        pca = joblib.load(f'{training_files_btc}/pca_{ticker}.pkl')
        scaled = scaler.transform(data[features])
        pca_data = pca.transform(scaled)


    pca_df = pd.DataFrame(pca_data, columns=[f'PC{i+1}' for i in range(pca_data.shape[1])], index=data.index)
    data = pd.concat([data, pca_df], axis=1)

    X_data, y_data = create_sequences(data, sequence_length, num_sequences, has_target)

    combined_data = X_data[[f'PC{i+1}' for i in range(pca_data.shape[1])]]

    if has_target:
        combined_target_data = y_data['Target']
        y_array = np.array(combined_target_data.values.reshape(-1))
        np.save(f'{training_files_btc}/y_train_{ticker}.npy', y_array)
    else:
        y_data.to_csv(f"{training_files_btc}/timestamps_{ticker}.csv")


    X_array = np.array(combined_data.values.reshape(-1, sequence_length, 3))
    np.save(f'{training_files_btc}/X_train_{ticker}.npy', X_array)

    """
    if has_target:
        print(f"Final y shape: {y_array.shape}")
        print(f"Total 0s: {np.sum(y_array == 0)}, Total 1s: {np.sum(y_array == 1)}")
    """