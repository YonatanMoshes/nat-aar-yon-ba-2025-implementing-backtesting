import os
import pandas as pd
from binance.client import Client
from datetime import timedelta, timezone, datetime
import sys
import time
from consts import training_files_btc

def update_csv_with_latest_hour(ticker):

    OUTPUT_CSV = os.path.join(training_files_btc, f'{ticker}_24k.csv')

    SYMBOL = f"{ticker}USDT"
    INTERVAL = Client.KLINE_INTERVAL_5MINUTE
    client = Client()

    if os.path.exists(OUTPUT_CSV):
        df = pd.read_csv(OUTPUT_CSV, parse_dates=["timestamp"])
    else:
        # print(f"{OUTPUT_CSV} does not exist. Run initial fetch.")
        return

    last_timestamp = df["timestamp"].iloc[-1]

    # print("Current timestamp:", last_timestamp)

    start_time = last_timestamp + timedelta(minutes=5)
    end_time = start_time + timedelta(minutes=5 * 11)

    # !!!!! ONLY FOR DEVELOPMENT !!!!!!

    # DATA_CUTOFF_DATE_STR = "2025-06-30 20:20:00"
    # DATA_CUTOFF_DATE = datetime.strptime(DATA_CUTOFF_DATE_STR, "%Y-%m-%d %H:%M:%S")
    # if(end_time > DATA_CUTOFF_DATE):
    #     return 0, None

    total_added = 0
    latest_timestamp = None

    success = False
    while not success:
        try:
            new_klines = client.get_historical_klines(
                SYMBOL,
                INTERVAL,
                start_str=start_time.strftime("%d %b, %Y %H:%M:%S"),
                end_str=end_time.strftime("%d %b, %Y %H:%M:%S")
            )

            new_df = pd.DataFrame(new_klines, columns=[
                "timestamp", "open", "high", "low", "close", "volume",
                "close_time", "quote_asset_volume", "num_trades",
                "taker_buy_base_volume", "taker_buy_quote_volume", "ignore"
            ])
            new_df["timestamp"] = pd.to_datetime(new_df["timestamp"], unit="ms")

            numeric_cols = ["open", "high", "low", "close", "volume",
                            "quote_asset_volume", "num_trades",
                            "taker_buy_base_volume", "taker_buy_quote_volume"]
            new_df[numeric_cols] = new_df[numeric_cols].astype(float)
            new_df.dropna(inplace=True)

            if new_df.empty:
                # print(f"New data for {SYMBOL} was incomplete and removed. Skipping this interval.")
                success = True
                continue

            total_added = new_df.shape[0]
            latest_timestamp = new_df["timestamp"].iloc[-1]
            latest_timestamp = latest_timestamp.tz_localize('UTC') 

            df = pd.concat([df, new_df], ignore_index=True)
            df = df.iloc[total_added:].reset_index(drop=True)

            df.to_csv(OUTPUT_CSV, index=False)

            # print(f"Updated CSV with {len(new_df)} new candles. Total rows: {len(df)}")
            success = True  # Exit the loop after successful execution

        except Exception as e:
            print("Error fetching new klines:", e)
            print("Retrying in 10 seconds...")
            time.sleep(15)
    return total_added, latest_timestamp
        

