import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import MACD, EMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import VolumeWeightedAveragePrice, OnBalanceVolumeIndicator

def calculate_indicators(df):
    df = df.copy()
    close = df['close']
    high = df['high']
    low = df['low']
    df['volume'] = df['volume'].clip(lower=1e-6, upper=1e6) 
    volume = df['volume']
    
    # === Lagged Returns ===
    for lag in [1]:
        df[f'ret_lag_{lag}'] = np.log1p(close.pct_change(lag).abs())
    
    for lag in [5]:
        df[f'volatility_{lag}'] = close.pct_change().rolling(lag).std()
        df[f'ATR_{lag}'] = AverageTrueRange(high=high, low=low, close=close, window=lag).average_true_range()
        df[f'RSI_{lag}'] = RSIIndicator(close=close, window=lag).rsi()
        df[f'volume_change_{lag}'] = volume.pct_change(lag).abs()
        bb = BollingerBands(close=close, window=lag)
        df[f'BB_width_{lag}'] = (bb.bollinger_hband() - bb.bollinger_lband()) / close

    macd = MACD(close=close, window_slow=12, window_fast=6, window_sign=3)
    df['MACD_diff'] = macd.macd_diff().abs()
    
    # === Volume Features ===
    df['OBV'] = OnBalanceVolumeIndicator(close=close, volume=volume).on_balance_volume().abs()
    inf_cols = df.columns[df.isin([np.inf, -np.inf]).any()]
    
    df = df.dropna()
    return df

def define_target(df):
    df['Target_pct'] = (df['close'].shift(-12) - df['close']) / df['close']
    df['Target_pct'] = np.log1p(df['Target_pct'].abs())
    df['Target_pct'] = df['Target_pct'].replace([np.inf, -np.inf], np.nan)

    df.dropna(inplace=True)
    return df