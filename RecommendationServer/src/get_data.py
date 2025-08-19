import os
from pymongo import MongoClient
from datetime import datetime
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import MACD, ADXIndicator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator, ChaikinMoneyFlowIndicator
import numpy as np
import pandas as pd

from consts import final_feature_columns, WINDOW_SIZE

MONGO_URI =  os.environ.get('CONNECTION_STRING', 'mongodb://localhost:27017/') #'mongodb://host.docker.internal:27017/' #
MONGO_DATABASE_NAME = os.environ.get('DATABASE_NAME', 'crypto_predictions') #'crypto_predictions' # 

# --- Helper Functions ---

def get_max_positive_threshold(preds_dict):
    """
    Finds the highest numerical threshold index that has a positive prediction (value of 1).
    Returns -1.0 if no thresholds are positive. This is the robust version.
    """
    if not isinstance(preds_dict, dict):
        return -1.0 # Handle case where data might be missing (e.g., NaN)
        
    positive_threshold_indices = [
        int(k.split('_')[-1]) for k, v in preds_dict.items() if v == 1
    ]
    
    if not positive_threshold_indices:
        return -1.0
    else:
        return float(max(positive_threshold_indices))

def calculate_indicators(df_normalized):
    """
    Calculates technical indicators on a DataFrame that has already been
    normalized (i.e., OHLCV are percentage changes).
    """
    df = df_normalized.copy()
    close = df['close'] # This is pct_change of close
    high = df['high']   # This is pct_change of high
    low = df['low']
    volume = df['volume']
    
    # These indicators are fine to run on returns data
    for window in [5, 14, 30]:
        df[f'RSI_{window}'] = RSIIndicator(close=close, window=window).rsi()
        df[f'Stoch_k_{window}'] = StochasticOscillator(high=high, low=low, close=close, window=window).stoch()

    macd = MACD(close=close, window_slow=26, window_fast=12, window_sign=9)
    df['MACD_diff'] = macd.macd_diff() # No longer need to normalize by close
    
    adx_indicator = ADXIndicator(high=high, low=low, close=close, window=14)
    df['ADX'] = adx_indicator.adx()
    
    # Note: BB and ATR on returns data have a different meaning, but are valid features
    for window in [14, 30]:
        bb = BollingerBands(close=close, window=window)
        df[f'BB_width_{window}'] = (bb.bollinger_hband() - bb.bollinger_lband()) / (close + 1e-9) # Add epsilon
        df[f'ATR_norm_{window}'] = AverageTrueRange(high=high, low=low, close=close, window=window).average_true_range()

    df['CMF'] = ChaikinMoneyFlowIndicator(high=high, low=low, close=close, volume=volume, window=20).chaikin_money_flow()
    
    # We DO NOT calculate ret_lag here anymore. It's done on the original price data.
    
    # Select only the calculated indicator columns to return
    indicator_cols = [
        'RSI_5', 'RSI_14', 'RSI_30', 'Stoch_k_5', 'Stoch_k_14', 'Stoch_k_30',
        'MACD_diff', 'ADX', 'BB_width_14', 'BB_width_30', 'ATR_norm_14', 'ATR_norm_30', 'CMF'
    ]
    
    return df[indicator_cols]

def _fetch_and_sync_raw_data(start_date, end_date, stock, db):
    """
    (Internal Helper) Efficiently fetches and synchronizes raw data from MongoDB.
    1. Finds the latest common timestamp *first*.
    2. Fetches only the necessary data up to that timestamp.
    """
    print(f"Fetching data for {stock} from {start_date} to {end_date}...")

    # Efficiently get the max timestamp from each collection using the DB index
    collections = {
        'ohlc': db[f"ohlc_{stock}"],
        'binary': db[f"binary_{stock}"],
        'pct': db[f"pct_{stock}"]
    }
    
    timestamps = []
    for name, coll in collections.items():
        # find_one with sort is highly efficient
        latest_doc = coll.find_one(
            {"timestamp": {"$lte": end_date}}, 
            sort=[("timestamp", -1)], 
            projection={"timestamp": 1}
        )
        if latest_doc:
            timestamps.append(latest_doc['timestamp'])

    print(f"Latest timestamps for {stock}: {timestamps}")

    if not timestamps: return None
    
    # Determine the latest timestamp where ALL data is available
    latest_common_ts = min(timestamps)

    # Fetch all data ONCE, up to the synchronized timestamp
    query = {"timestamp": {"$gte": start_date, "$lte": latest_common_ts}}
    ohlc_data = list(collections['ohlc'].find(query))
    binary_data = list(collections['binary'].find(query))
    pct_data = list(collections['pct'].find(query))
    
    # Merge the data
    # Initialize the map with the core OHLC data. This is our source of truth.
    data_map = {doc["timestamp"]: doc for doc in ohlc_data}

    # Update with binary data ONLY for timestamps that already exist.
    for doc in binary_data:
        ts = doc.get("timestamp")
        if ts in data_map:  # Check if the key exists before updating
            data_map[ts]['binary_predictions'] = {}
            for i in range(9): # Or whatever your number of thresholds is
                key = f'prediction_threshold_{i}'
                if key in doc:
                    data_map[ts]['binary_predictions'][key] = doc[key]

    # Update with pct data ONLY for timestamps that already exist.
    for doc in pct_data:
        ts = doc.get("timestamp")
        if ts in data_map:  # Check if the key exists before updating
            data_map[ts]['pct_prediction'] = doc["prediction"]

    if not data_map: return None
    
    df = pd.DataFrame(list(data_map.values())).sort_values(by="timestamp")
    return df

def get_latest_timestamp_from_mongo(stock):
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DATABASE_NAME]

        # Collection names
        ohlc_collection_name = f"ohlc_{stock}"
        binary_collection_name = f"binary_{stock}"
        pct_collection_name = f"pct_{stock}"

        # Get available collections
        existing_collections = db.list_collection_names()

        ohlc_exists = ohlc_collection_name in existing_collections
        binary_exists = binary_collection_name in existing_collections
        pct_exists = pct_collection_name in existing_collections

        # Find the maximum timestamp present in all datasets
        ohlc_max_ts = db[ohlc_collection_name].find_one(
            sort=[("timestamp", -1)], projection={"timestamp": 1, "_id": 0}
        )["timestamp"] if ohlc_exists else None

        binary_max_ts = db[binary_collection_name].find_one(
            sort=[("timestamp", -1)], projection={"timestamp": 1, "_id": 0}
        )["timestamp"] if binary_exists else None

        pct_max_ts = db[pct_collection_name].find_one(
            sort=[("timestamp", -1)], projection={"timestamp": 1, "_id": 0}
        )["timestamp"] if pct_exists else None

        # Only keep the timestamp if it exists in all three collections
        if not ohlc_max_ts or not binary_max_ts or not pct_max_ts:
            return None
        
        max_timestamp = min(ohlc_max_ts, binary_max_ts, pct_max_ts)       

        return max_timestamp
    except Exception as e:
        print(f"An error occurred while fetching the latest timestamp for {stock}: {e}")    
        return None

# --- Main Data Functions ---

def fetch_and_prepare_single_stock(start_date, end_date, stock = "BTC"):
    """
    Fetches raw OHLC, binary predictions, and percentage predictions for a single stock
    from MongoDB. It synchronizes them by timestamp and merges them into a single,
    clean DataFrame.

    This function DOES NOT calculate technical indicators. Its only job is to
    get the raw, aligned data from the source.
    """
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DATABASE_NAME]

        # Get raw, synced data using the efficient helper function
        df = _fetch_and_sync_raw_data(start_date, end_date, stock, db)

        print(f"Fetched {len(df)} rows for {stock} from MongoDB between {start_date} and {end_date}.")

        if df is None or df.empty:
            return None
        
        print(df.columns, flush=True)

        # If binary predictions were found, process them. Otherwise, create a default column.
        if 'binary_predictions' in df.columns:
            # Handle rows where a binary prediction might be missing (NaN)
            df['binary_predictions'] = df['binary_predictions'].fillna({})
            df["max_positive_threshold"] = df["binary_predictions"].apply(get_max_positive_threshold)
        else:
            df["max_positive_threshold"] = -1.0 # Default value if no binary data exists

        # If percentage predictions were found, keep them. Otherwise, create a default column.
        if 'pct_prediction' not in df.columns:
            df['pct_prediction'] = 0.0 # Default value if no pct data exists

        final_df = df.copy()

        # Create the normalized df for stable indicator calculation
        indicator_df = final_df[['open', 'high', 'low', 'close', 'volume']].pct_change()
        indicator_df.dropna(inplace=True)
        calculated_indicators = calculate_indicators(indicator_df)

        # Join the stable indicators back to the main df
        final_df = final_df.join(calculated_indicators)

        # Calculate lagged returns on the ORIGINAL price data
        for lag in [1, 3, 5, 10]:
            final_df[f'ret_lag_{lag}'] = final_df['close'].pct_change(lag)

        if '_id' in final_df.columns: final_df.drop(columns=['_id'], inplace=True)
        if 'binary_predictions' in final_df.columns: final_df.drop(columns=['binary_predictions'], inplace=True)

        print(f"Final df size : {len(final_df)} And has columns : {final_df.columns}")

        return final_df

    except Exception as e:
        print(f"An unexpected error occurred in fetch_and_prepare_single_stock for {stock}: {e}")
        # In a real system, you would log this error in more detail
        raise


def prepare_and_combine_data(stocks, start_date, end_date):
    all_dfs = []
    print(f"Preparing data for stocks: {stocks}")

    for stock in stocks:
        print(f"--- Processing {stock} ---")
        featured_df  = fetch_and_prepare_single_stock(start_date, end_date, stock=stock)
        
        if featured_df  is None or featured_df .empty:
            print(f"Warning: No data found for {stock}. Skipping.")
            continue

        all_dfs.append(featured_df)

    if not all_dfs:
        print("Error: No data could be processed.")
        return pd.DataFrame()

    combined_df = pd.concat(all_dfs, ignore_index=True)
    
    # Keep only the columns we need, dropping the rest
    # `reindex` is a safe way to select columns and handle missing ones
    combined_df = combined_df.reindex(columns=final_feature_columns)
    
    # Final cleanup before returning
    combined_df.dropna(inplace=True)
    combined_df.reset_index(drop=True, inplace=True)
    
    print("\nData preparation complete.")
    print(f"Total rows in final dataset: {len(combined_df)}")
    print(f"Features being used ({len(combined_df.columns)}): {combined_df.columns.tolist()}")

    return combined_df

def get_data_for_recommendation(stock):
    end_time_str = get_latest_timestamp_from_mongo(stock)
    if not end_time_str:
        print(f"No data found for {stock}.")
        return None
    
    print(f"Latest timestamp for {stock}: {end_time_str}")

    # We need at least 30 for indicators, plus 10 for env, plus buffer.
    lookback_periods = 200 
    start_time = pd.to_datetime(end_time_str) - pd.Timedelta(minutes=5 * lookback_periods) 

    start_time_str = start_time.strftime('%Y-%m-%d %H:%M:%S')

    featured_df  = fetch_and_prepare_single_stock(start_time_str, end_time_str, stock=stock)
    if featured_df  is None or featured_df.empty:
        print(f"No data found for {stock} in the specified date range.")
        return None
    
    # Apply the same final filtering
    final_df = featured_df.reindex(columns=final_feature_columns)
    final_df.dropna(inplace=True)

    print(f"Final df size : {len(final_df)} And has columns : {final_df.columns}")

    if final_df.empty:
        print(f"Dataframe is empty after feature engineering and cleaning for {stock}.")
        return None

    required_rows = WINDOW_SIZE + 5
    
    if len(final_df) < required_rows:
        print(f"CRITICAL ERROR: Not enough data remains. Required: {required_rows}, Found: {len(final_df)}")
        return None

    # Return only the last `WINDOW_SIZE` rows needed by the environment, with a little buffer
    return final_df.tail(required_rows)