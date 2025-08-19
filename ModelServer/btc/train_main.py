from btc.create_indicators import calculate_indicators, define_target
from btc.training_data import create_input
from btc.training import train
import pandas as pd
import sys
from consts import training_files_btc

def train_main(ticker) :
    df = pd.read_csv(f'{training_files_btc}/{ticker}_24k.csv')
    df = df.dropna()

    df_with_indicators = calculate_indicators(df)
    df_with_indicators = define_target(df_with_indicators)

    create_input(df_with_indicators, ticker ,len(df_with_indicators) - 70)
    train(ticker)