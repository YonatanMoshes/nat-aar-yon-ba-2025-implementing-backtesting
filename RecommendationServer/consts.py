# The columns in the dataframe that the RL model was trained on.
final_feature_columns = [
    'close', 'max_positive_threshold', 'pct_prediction', 'RSI_5', 'RSI_14',
    'RSI_30', 'Stoch_k_5', 'Stoch_k_14', 'Stoch_k_30', 'MACD_diff', 'ADX',
    'BB_width_14', 'BB_width_30', 'ATR_norm_14', 'ATR_norm_30', 'CMF',
    'ret_lag_1', 'ret_lag_3', 'ret_lag_5', 'ret_lag_10'
]

# Amount of previous data points the RL model gets.
WINDOW_SIZE = 10

AVAILABLE_STOCKS = ["BTC", "ETH", "LTC"]