from pymongo import MongoClient, UpdateOne
import pandas as pd
from binance.client import Client
import time
from datetime import datetime, timedelta
import os

MONGO_URI = os.environ.get('CONNECTION_STRING', 'mongodb://localhost:27017/')
MONGO_DATABASE_NAME = os.environ.get('DATABASE_NAME', 'crypto_predictions')

def sync_ohlc_data(tickers):
    """
    Connects to MongoDB and Binance to synchronize OHLC data collections
    for the specified tickers ONLY.

    Args:
        tickers (list): A list of stock symbols to sync, e.g., ["BTC", "ETH"].
    """
    # === MongoDB Setup ===
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[MONGO_DATABASE_NAME]

    # === Binance Setup ===
    binance = Client()
    symbol_configs = {
        "BTC": ("BTCUSDT", "binary_BTC", "ohlc_BTC"),
        "ETH": ("ETHUSDT", "binary_ETH", "ohlc_ETH"),
        "LTC": ("LTCUSDT", "binary_LTC", "ohlc_LTC")
    }
    interval = Client.KLINE_INTERVAL_5MINUTE
    limit = 1000

    for ticker in tickers:
        config = symbol_configs.get(ticker)
        
        if not config:
            print(f"Warning: No configuration found for ticker '{ticker}'. Skipping.")
            continue

        symbol, binary_collection_name, ohlc_collection_name = config

        print(f"--- Synchronizing data for {ticker} ({symbol}) ---")

        binary_collection = db[binary_collection_name]
        ohlc_collection = db[ohlc_collection_name]
        
        # 1. ## DETERMINE THE DATE RANGE BASED ON THE BINARY COLLECTION ##
        # Find the absolute earliest and latest timestamps in the source of truth: the binary collection.
        # We use an aggregation pipeline to do this in a single, efficient query.
        pipeline = [
            {"$group": {
                "_id": None,
                "min_date": {"$min": "$timestamp"},
                "max_date": {"$max": "$timestamp"}
            }}
        ]
        date_range_result = list(binary_collection.aggregate(pipeline))

        if not date_range_result:
            print(f"No documents found in '{binary_collection_name}'. Skipping.")
            continue
        
        # The absolute boundaries of our data sync operation.
        earliest_binary_date = pd.to_datetime(date_range_result[0]['min_date'])
        latest_binary_date = pd.to_datetime(date_range_result[0]['max_date'])
        
        # 2. ## DETERMINE THE START DATE FOR FETCHING ##
        # Now, check the ohlc_collection to see where we need to start from.
        latest_ohlc_doc = ohlc_collection.find_one(sort=[("timestamp", -1)])
        
        if latest_ohlc_doc:
            # We have existing data. Start fetching from the record AFTER the latest one we have.
            start_date = pd.to_datetime(latest_ohlc_doc['timestamp']) + timedelta(minutes=5)
            print(f"'{ohlc_collection_name}' exists. Backfilling from last entry: {start_date}")
        else:
            # The ohlc_collection is empty. Start from the very beginning of the binary data.
            start_date = earliest_binary_date
            print(f"'{ohlc_collection_name}' is empty. Fetching all historical data from the beginning of binary data.")
            
        # 3. ## THE END DATE IS NOW FIXED TO THE LATEST BINARY DATE ##
        end_date = latest_binary_date

        if start_date >= end_date:
            print(f"Data for '{ohlc_collection_name}' is already synchronized with '{binary_collection_name}'. Skipping.")
            continue

        print(f"Syncing {symbol} OHLC data from: {start_date} to {end_date}")

        # 4. ## FETCH BINANCE DATA IN CHUNKS (No changes here) ##
        all_klines = []
        current_start = start_date
        while current_start < end_date:
            try:
                klines = binance.get_historical_klines(
                    symbol,
                    interval,
                    current_start.strftime("%d %b, %Y %H:%M:%S"),
                    end_date.strftime("%d %b, %Y %H:%M:%S"), # Pass the end_date here
                    limit=limit
                )
                if not klines:
                    break
                
                all_klines.extend(klines)
                last_timestamp_ms = klines[-1][0]
                current_start = pd.to_datetime(last_timestamp_ms, unit='ms') + timedelta(minutes=5)
                print(f"Fetched {len(klines)} rows, advancing to {current_start}")
                time.sleep(1)
            except Exception as e:
                print(f"Binance error for {symbol}:", e)
                print("Waiting for 10 seconds before retrying...")
                time.sleep(10)

        if not all_klines:
            print(f"No new data fetched for {symbol}.")
            continue

        # 5. ## PROCESS AND INSERT/UPDATE DATA (No changes here) ##
        operations = []
        for kline in all_klines:
            doc = {
                "timestamp": pd.to_datetime(kline[0], unit='ms').strftime('%Y-%m-%d %H:%M:%S'),
                "open": float(kline[1]),
                "high": float(kline[2]),
                "low": float(kline[3]),
                "close": float(kline[4]),
                "volume": float(kline[5])
            }
            operations.append(
                UpdateOne(
                    {"timestamp": doc["timestamp"]},
                    {"$set": doc},
                    upsert=True
                )
            )

        if operations:
            try:
                result = ohlc_collection.bulk_write(operations, ordered=False)
                print(f"Finished for {symbol}. Upserted: {result.upserted_count}, Modified: {result.modified_count}")
            except Exception as e:
                print(f"MongoDB bulk write error: {e}")
        else:
            print(f"No documents to insert/update for {symbol}.")

    mongo_client.close()
    print("\nProcess finished.")