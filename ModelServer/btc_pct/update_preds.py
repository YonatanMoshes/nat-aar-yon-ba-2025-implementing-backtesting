# btc_pct/update_preds.py

import redis
import time
from datetime import datetime, timedelta, timezone
# This function must return (count, latest_timestamp)
from btc_pct.get_current_data import update_csv_with_latest_hour as update_csv_with_latest_interval
from btc_pct.test_main import test_main
from btc_pct.train_main import train_main

TRAINING_INTERVAL_IN_POINTS = 36
TRAINING_INTERVAL_SECONDS = 3 * 60 * 60

MODEL_TRAINING_LOCK_KEY = "lock:train_main:btc_pct_model"
LOCK_TTL_SECONDS = 10 * 60
WAIT_TIMEOUT_SECONDS = 5 * 60
WAIT_INTERVAL_SECONDS = 5

def update_btc_pct(symbol, redis_client):
    """
    Catches up for a single symbol, using a persistent Redis counter and passing
    the correct new interval count to its unique train_main function.
    """
    #print(f"Running update for BTC_PCT model on {symbol}...")
    total_new_intervals_this_run = 0
    latest_processed_timestamp = None

    # Define unique Redis keys for this model's state
    training_timestamp_key = f'last_training_time:btc_pct:{symbol}'
    processed_intervals_key = f'intervals_processed:btc_pct:{symbol}'

    while True:
        num_new, new_timestamp = update_csv_with_latest_interval(symbol)
        
        if num_new > 0:
            if new_timestamp:
                latest_processed_timestamp = new_timestamp

            #print(f"Fetched {num_new} new 5-min interval(s) for {symbol} (PCT). Making predictions...")
            test_main(symbol, num_new)
            total_new_intervals_this_run += num_new

            # 1. Atomically increment the persistent counter
            intervals_since_last_train = redis_client.incrby(processed_intervals_key, num_new)

            # 2. Check if we've accumulated enough new data
            if intervals_since_last_train >= TRAINING_INTERVAL_IN_POINTS:
                # 3. If so, check the time-based cooldown
                last_training_timestamp_str = redis_client.get(training_timestamp_key)
                should_train_now = False
                if not last_training_timestamp_str:
                    should_train_now = True
                else:
                    last_training_time = datetime.fromisoformat(last_training_timestamp_str).replace(tzinfo=timezone.utc)
                    if latest_processed_timestamp and latest_processed_timestamp - last_training_time >= timedelta(seconds=TRAINING_INTERVAL_SECONDS):
                        should_train_now = True

                if should_train_now:
                    #print(f"--- Training for BTC_PCT:{symbol} is due. Attempting to acquire BTC_PCT model lock... ---")
                    lock_acquired = False
                    start_wait_time = time.time()

                    while time.time() - start_wait_time < WAIT_TIMEOUT_SECONDS:
                        lock_acquired = redis_client.set(
                            MODEL_TRAINING_LOCK_KEY, # Use the model-specific key
                            f"worker_for_btc_pct_{symbol}",
                            nx=True,
                            ex=LOCK_TTL_SECONDS
                        )
                        if lock_acquired:
                            break
                        
                        #print(f"--- BTC_PCT model training lock is busy. Waiting {WAIT_INTERVAL_SECONDS}s... ---")
                        time.sleep(WAIT_INTERVAL_SECONDS)

                    
                    if lock_acquired:
                        #print(f"--- BTC_PCT model training lock acquired for BTC_PCT:{symbol}. ---")
                        try:
                            #print(f"--- Conditions met (Count: {intervals_since_last_train}). Triggering training for BTC_PCT:{symbol}. ---")
                            #print(f"--- Passing `num_new` of {total_new_intervals_this_run} to train_main for PCT. ---")
                            train_main(symbol, total_new_intervals_this_run)

                            if latest_processed_timestamp:
                                redis_client.set(training_timestamp_key, latest_processed_timestamp.isoformat())
                                ##print(f"--- Training for BTC_PCT:{symbol} complete. Timestamp updated. ---")
                            
                            redis_client.set(processed_intervals_key, 0)
                        finally:
                            #print(f"--- Releasing BTC_PCT model training lock held by BTC_PCT:{symbol}. ---")
                            redis_client.delete(MODEL_TRAINING_LOCK_KEY)
                    #else:
                        #print(f"--- Could not acquire BTC_PCT model training lock for BTC_PCT:{symbol} within {WAIT_TIMEOUT_SECONDS} seconds. Giving up for this run. ---")
        else:
            #print(f"No more new data for {symbol}. BTC_PCT model is up-to-date.")
            break

    #print(f"Finished this run. Processed a total of {total_new_intervals_this_run} new intervals for BTC_PCT:{symbol}.")
    return total_new_intervals_this_run