from pymongo import MongoClient
import pandas as pd

# ==== Configuration ====
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "crypto_predictions"
COLLECTION_NAME = "pct_BTC"
TIMESTAMP_FIELD = "timestamp"  # field name in your MongoDB docs

# Date range for expected timestamps (inclusive)
START_TIME = "2025-05-19 23:00:00"
END_TIME = "2025-06-25 06:55:00"

# ==== Connect to MongoDB ====
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# ==== Fetch all timestamps from MongoDB ====
docs = list(collection.find(
    {}, 
    {"_id": 0, TIMESTAMP_FIELD: 1}
))

# Convert to pandas datetime
timestamps = pd.to_datetime([doc[TIMESTAMP_FIELD] for doc in docs])

# ==== Find duplicates ====
duplicate_counts = timestamps.value_counts()
duplicates = duplicate_counts[duplicate_counts > 1]

# ==== Report ====
print(f"Found {len(duplicates)} duplicate timestamps:")
print(duplicates)

# ==== Optional: Get all docs with duplicate timestamps ====
duplicate_values = duplicates.index

all_dupes = list(collection.find({TIMESTAMP_FIELD: {"$in": [ts.strftime("%Y-%m-%d %H:%M:%S") for ts in duplicate_values]}}))

# Print some duplicate docs
for doc in all_dupes:
    print(doc)

print(len(all_dupes))


expected = pd.date_range(start=START_TIME, end=END_TIME, freq="5min")

timestamps_in_db = pd.to_datetime(
    [doc[TIMESTAMP_FIELD] for doc in docs]
)
# ==== Find missing timestamps ====
missing = expected.difference(timestamps_in_db)

# ==== Report ====
print(f"Total expected timestamps: {len(expected)}")
print(f"Found in DB: {len(timestamps_in_db)}")
print(f"Missing timestamps: {len(missing)}")
print(missing)

