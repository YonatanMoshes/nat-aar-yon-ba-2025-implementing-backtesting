import pandas as pd
from binance.client import Client
from datetime import datetime, timedelta
import time
import sys





def fetch_latest_candles(end_time, ticker):

    SYMBOL = f"{ticker}USDT"
    INTERVAL = Client.KLINE_INTERVAL_5MINUTE
    CANDLE_LIMIT = 24000

    client = Client()
    print("Fetching latest candles...")

    CANDLES_PER_REQUEST = 1000
    REQUESTS_NEEDED = CANDLE_LIMIT // CANDLES_PER_REQUEST
    delta = timedelta(minutes=CANDLES_PER_REQUEST * 5)

    candles = []

    for _ in range(REQUESTS_NEEDED):
        start_time = end_time - delta

        try:
            klines = client.get_historical_klines(
                SYMBOL,
                INTERVAL,
                start_str=start_time.strftime("%d %b, %Y %H:%M:%S"),
                end_str=end_time.strftime("%d %b, %Y %H:%M:%S")
            )
            candles = klines + candles  # prepend to keep chronological order
            end_time = start_time
            time.sleep(0.2)
        except Exception as e:
            print("Error fetching klines:", e)
            time.sleep(10)

    process_and_save(candles, ticker)

def process_and_save(candles, ticker):
    from pathlib import Path

    folder_path = Path("training_files")  

    OUTPUT_CSV = f"{folder_path}/{ticker}_24k.csv"

    df = pd.DataFrame(candles, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "quote_asset_volume", "num_trades",
        "taker_buy_base_volume", "taker_buy_quote_volume", "ignore"
    ])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")

    numeric_cols = ["open", "high", "low", "close", "volume",
                    "quote_asset_volume", "num_trades",
                    "taker_buy_base_volume", "taker_buy_quote_volume"]
    df[numeric_cols] = df[numeric_cols].astype(float)
    df.dropna(inplace=True)

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved latest {len(df)} candles to {OUTPUT_CSV}")

