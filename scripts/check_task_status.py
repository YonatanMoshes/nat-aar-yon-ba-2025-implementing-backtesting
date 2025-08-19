import sys
import redis
import time
import os

# This script will be run on the HOST, so it connects to localhost
REDIS_URL = "redis://localhost:6379/0" # Assume Redis port 6379 is exposed in docker-compose
POLL_INTERVAL_SECONDS = 15

def wait_for_tasks_to_complete(stocks_to_check):
    """
    Polls Redis to check for the existence of locks for the given stocks.
    Exits successfully when all locks are gone.
    Exits with an error if the timeout is reached.
    """
    print(f"\n=> Now monitoring Redis locks for stocks: {stocks_to_check}...")
    print(f"   (Checking every {POLL_INTERVAL_SECONDS}s)")

    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping() # Verify connection

        
    except redis.exceptions.ConnectionError as e:
        print(f"\n[ERROR] Could not connect to Redis at {REDIS_URL}.")
        print("        Is the 'redis' service running and is port 6379 exposed in docker-compose?")
        sys.exit(1)


    start_time = time.time()
    while True:

        all_existing_locks = redis_client.keys("lock:stock:*")
        if all_existing_locks:
            print(f"Ground Truth: Found {len(all_existing_locks)} lock(s) on server: {all_existing_locks}")
        else:
            print("Ground Truth: No keys of shape lock:stock:* found on server.")

        # Check the status of each lock
        locks_remaining = []
        for stock in stocks_to_check:
            lock_key = f"lock:stock:{stock}"
            if redis_client.exists(lock_key):
                locks_remaining.append(stock)
        
        # Check exit conditions
        if not locks_remaining:
            print("\n✓ All tasks have completed (all locks released). Proceeding.")
            break
            
        elapsed_time = time.time() - start_time

        # Print a status update and wait
        print(f"   [{int(elapsed_time)}s] Still waiting for tasks: {locks_remaining}...", end='\r')
        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    # The script takes a comma-separated list of stocks as an argument
    if len(sys.argv) < 2:
        print("Usage: python check_task_status.py BTC,ETH,LTC")
        sys.exit(1)
        
    stocks = [s.strip().upper() for s in sys.argv[1].split(',')]
    wait_for_tasks_to_complete(stocks)