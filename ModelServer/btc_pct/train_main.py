import pandas as pd
from btc_pct.create_indicators import calculate_indicators, define_target
from btc_pct.training_data import create_input
from btc_pct.training import train
from btc_pct.get_current_data import update_csv_with_latest_hour
import sys
from consts import training_files_btc_pct

def train_main(ticker, num_preds) :
    num_preds = int(num_preds)

    df = pd.read_csv(f'{training_files_btc_pct}/{ticker}_24k.csv')
    df_with_indicators = calculate_indicators(df)
    df_with_indicators = define_target(df_with_indicators)

    create_input(df_with_indicators, ticker, num_preds)
    train(ticker)

