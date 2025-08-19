from pymongo import MongoClient
import sys
import os

MONGO_URI = os.environ.get('CONNECTION_STRING', 'mongodb://localhost:27017/')
MONGO_DATABASE_NAME = os.environ.get('DATABASE_NAME', 'crypto_predictions')

tickers = sys.argv[1:]
for ticker in tickers:
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DATABASE_NAME]
    collection = db[f"binary_{ticker}"]

    # Define your string-based timestamps (must match the format used in DB)
    start_ts = "2025-06-25 19:00:00"
    end_ts   = "2025-06-25 23:55:00"

    timestamps = collection.distinct("timestamp", {
        "timestamp": {
            "$gte": start_ts,
            "$lte": end_ts
        }
    })

    deleted_count = 0

    # For each timestamp, delete just one matching document
    for ts in timestamps:
        result = collection.delete_one({"timestamp": ts})
        deleted_count += result.deleted_count

    print(f"Deleted {deleted_count} documents.")