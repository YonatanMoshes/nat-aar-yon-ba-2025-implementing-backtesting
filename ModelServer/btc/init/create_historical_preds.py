import subprocess
import datetime
import pandas as pd
import time
import sys
from get_all_data import fetch_latest_candles 

tickers = sys.argv[1:]
folder_path = "/Users/aaron/btc/training_files"

start_time =  datetime.datetime(2025, 5, 20, 0, 0, 0)
end_time =  datetime.datetime(2025, 6, 22, 16, 0, 0)

for ticker in tickers:  
   fetch_latest_candles(start_time, ticker)

df = pd.read_csv(f"{folder_path}/{tickers[0]}_24k.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])

current_time = df.iloc[-1]["timestamp"]

for ticker in tickers:
    subprocess.run(["python3", "train_main.py",f"{ticker}"])

while  current_time < end_time:

    for _ in range(3):
        for ticker in tickers:
            subprocess.run(["python", "test_main.py", f"{ticker}"])

    for ticker in tickers:
        subprocess.run(["python3", "train_main.py",f"{ticker}"])
    
    current_time += datetime.timedelta(minutes=36 * 5)
    time.sleep(0.1)

print("Finished running scripts.")
