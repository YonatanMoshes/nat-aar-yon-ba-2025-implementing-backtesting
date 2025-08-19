import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
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
    volume = df['volume']
    
    # === Order Flow ===
    df['taker_buy_ratio'] = df['taker_buy_quote_volume'] / (df['quote_asset_volume'] + 1e-9)
    
    # === Volume Features ===
    df['volume_zscore_12'] = (volume - volume.rolling(12).mean()) / (volume.rolling(12).std() + 1e-9)
    df['whale_trade_indicator'] = (volume / df['num_trades']) / (volume / df['num_trades']).rolling(24).mean()
    
    # === Price Features ===
    df['ret_1'] = close.pct_change(1)
    df['log_ret_1'] = np.log(close).diff(1)
    
    # === VWAP Relationships ===
    df['VWAP'] = VolumeWeightedAveragePrice(high=high, low=low, close=close, volume=volume, window=12).volume_weighted_average_price()
    df['close_vs_VWAP'] = (close - df['VWAP']) / close
    
    # === Momentum ===
    df['RSI_6'] = RSIIndicator(close=close, window=6).rsi()
    df['stoch_%K_6'] = StochasticOscillator(high=high, low=low, close=close, window=6, smooth_window=3).stoch()
    macd = MACD(close=close, window_slow=12, window_fast=6, window_sign=3)
    df['MACD_hist'] = macd.macd_diff()
    

    df['ema_6'] = EMAIndicator(close=close, window=6).ema_indicator()
    df['ema_12'] = EMAIndicator(close=close, window=12).ema_indicator()
    df['EMA_ratio_short'] =   df['ema_6'] /   df['ema_12']
    
    # 2. On-Balance Volume (OBV)
    df['OBV'] = OnBalanceVolumeIndicator(close=close, volume=volume).on_balance_volume()
    
    # 3. 20-period Volatility (Standard deviation of returns)
    df['volatility_20'] = close.pct_change().rolling(20).std()
    
    # === Volatility ===
    df['ATR_6'] = AverageTrueRange(high=high, low=low, close=close, window=6).average_true_range()
    bb = BollingerBands(close=close, window=6)
    df['BB_width_6'] = (bb.bollinger_hband() - bb.bollinger_lband()) / close
    
    # === Mean Reversion ===
    df['oversold_score'] = (close - low.rolling(6).min()) / close
    df['price_volume_divergence'] = close.rolling(12).corr(volume)
    

    df.dropna(inplace=True)
    return df

def define_target(df):
    df = df.copy() 

    future_close = df['close'].shift(-12)
    df['Target'] = np.where(future_close > df['close'], 1, 0)


    df['Target_pct'] = (future_close - df['close']) / df['close']
    df['Target_pct'] = df['Target_pct'].abs()
    

    df.dropna(inplace=True)

    return df



