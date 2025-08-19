# btc/update_preds.py

import redis
import time
from datetime import datetime, timedelta, timezone
# This function must return (count, latest_timestamp)
from btc.get_current_data import update_csv_with_latest_hour as update_csv_with_latest_interval
from btc.test_main import test_main
from btc.train_main import train_main

TRAINING_INTERVAL_IN_POINTS = 36  # 3 hours of 5-min data
TRAINING_INTERVAL_SECONDS = 3 * 60 * 60 # 3 hours in seconds

# The TTL ensures the lock is released even if a worker crashes mid-training.
MODEL_TRAINING_LOCK_KEY = "lock:train_main:btc_model"
LOCK_TTL_SECONDS = 10 * 60
WAIT_TIMEOUT_SECONDS = 5 * 60
WAIT_INTERVAL_SECONDS = 5

def update_btc(symbol, redis_client):
    """
    Catches up to the current time for a single symbol, using a persistent Redis
    counter and a dedicated timestamp for this model's training schedule.
    """
    print(f"Running update for BTC price model on {symbol}...")
    total_new_intervals_this_run = 0
    latest_processed_timestamp = None
    
    # Define unique Redis keys for this model's state
    training_timestamp_key = f'last_training_time:btc:{symbol}'
    processed_intervals_key = f'intervals_processed:btc:{symbol}'

    while True:
        # Unpack the count and latest timestamp from the data fetching function
        num_new, new_timestamp = update_csv_with_latest_interval(symbol)
        
        if num_new > 0:
            if new_timestamp:
                latest_processed_timestamp = new_timestamp

            # print(f"Fetched {num_new} new 5-min interval(s) for {symbol}. Making predictions...")
            test_main(symbol, num_new)
            total_new_intervals_this_run += num_new

            # 1. Atomically increment the persistent counter for processed data points
            intervals_since_last_train = redis_client.incrby(processed_intervals_key, num_new)

            # 2. Check if we've accumulated enough new data to consider training
            if intervals_since_last_train >= TRAINING_INTERVAL_IN_POINTS:
                # 3. If so, check if enough real-world time has passed (cooldown)
                last_training_timestamp_str = redis_client.get(training_timestamp_key)
                should_train_now = False
                if not last_training_timestamp_str:
                    should_train_now = True # Always train if it's the first time
                else:
                    last_training_time = datetime.fromisoformat(last_training_timestamp_str).replace(tzinfo=timezone.utc)
                    if latest_processed_timestamp and latest_processed_timestamp - last_training_time >= timedelta(seconds=TRAINING_INTERVAL_SECONDS):
                        should_train_now = True

                if should_train_now:
                    # print(f"--- Training for BTC:{symbol} is due. Attempting to acquire BTC model lock... ---")
                    lock_acquired = False
                    start_wait_time = time.time()
                    
                    while time.time() - start_wait_time < WAIT_TIMEOUT_SECONDS:
                        lock_acquired = redis_client.set(
                            MODEL_TRAINING_LOCK_KEY, 
                            f"worker_for_btc_{symbol}",
                            nx=True,
                            ex=LOCK_TTL_SECONDS
                        )
                        if lock_acquired:
                            break
                        
                        # print(f"--- BTC model training lock is busy. Waiting {WAIT_INTERVAL_SECONDS}s... ---")
                        time.sleep(WAIT_INTERVAL_SECONDS)

                    if lock_acquired:
                        # print(f"--- BTC model training lock acquired for BTC:{symbol}. ---")
                        
                        try:
                            # print(f"--- Conditions met (Count: {intervals_since_last_train}). Triggering training for BTC:{symbol}. ---")
                            # Call the training function for this model
                            train_main(symbol)
                            
                            # 4. Update the training timestamp using the latest data's timestamp
                            if latest_processed_timestamp:
                                redis_client.set(training_timestamp_key, latest_processed_timestamp.isoformat())
                                # print(f"--- Training for BTC:{symbol} complete. Timestamp updated to {latest_processed_timestamp}. ---")

                            # 5. IMPORTANT: Reset the persistent data counter back to 0
                            redis_client.set(processed_intervals_key, 0)
                        finally:
                            # print(f"--- Releasing BTC model training lock held by BTC:{symbol}. ---")
                            redis_client.delete(MODEL_TRAINING_LOCK_KEY)
                    # else:
                        # print(f"--- Could not acquire BTC model training lock for BTC:{symbol} within {WAIT_TIMEOUT_SECONDS} seconds. Giving up for this run. ---")
        else:
            # If no new data is found, the catch-up is complete for this run.
            # print(f"No more new data for {symbol}. BTC price model is up-to-date.")
            break
            
    # print(f"Finished this run. Processed a total of {total_new_intervals_this_run} new intervals for BTC:{symbol}.")
    return total_new_intervals_this_run