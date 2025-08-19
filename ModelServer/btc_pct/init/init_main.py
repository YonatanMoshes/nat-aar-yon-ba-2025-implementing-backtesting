import pandas as pd
from create_indicators import calculate_indicators, define_target
from training_data import create_input
from init_model import init_train
from btc_pct.get_all_data import fetch_latest_candles
from datetime import datetime
import sys


ticker = sys.argv[1]
folder_path = "/Users/aaron/btc_pct/training_files"

end_str = "2025-05-19 22:00:00"
end_time   = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")
fetch_latest_candles(end_time, ticker)

df = pd.read_csv(f'{folder_path}/{ticker}_24k.csv')
df_with_indicators = calculate_indicators(df)
df_with_indicators = define_target(df_with_indicators)


lower_bound = df_with_indicators['Target_pct'].quantile(0.01)
upper_bound = df_with_indicators['Target_pct'].quantile(0.99)
df_with_indicators = df_with_indicators[(df_with_indicators['Target_pct'] <= upper_bound)]
df_with_indicators = df_with_indicators[(df_with_indicators['Target_pct'] >= lower_bound)]

create_input(df_with_indicators, ticker, len(df_with_indicators) - 70)
init_train(ticker)

