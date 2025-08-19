from pymongo import MongoClient
from datetime import datetime, timedelta
import sys

ticker = sys.argv[1]
# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["crypto_predictions"]
collection = db[f"binary_{ticker}"]

# Define time range
start_ts = datetime.strptime("2025-06-03 11:00:00", "%Y-%m-%d %H:%M:%S")
end_ts = datetime.strptime("2025-06-03 12:00:00", "%Y-%m-%d %H:%M:%S")

# Insert documents
docs = []
current_ts = start_ts
while current_ts < end_ts:
    docs.append({
        "timestamp": current_ts.strftime("%Y-%m-%d %H:%M:%S"),
        "prediction": 0.04
    })
    current_ts += timedelta(minutes=5)

if docs:
    collection.insert_many(docs)
    print(f"Inserted {len(docs)} documents.")
else:
    print("No documents to insert.")
