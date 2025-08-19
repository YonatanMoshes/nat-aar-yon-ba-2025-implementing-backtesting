import os
import glob
import bson
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["crypto_predictions"]

# Import all BSON files in current directory
bson_files = glob.glob('../../mongo-backup/crypto_predictions/*.bson') #glob.glob('../../mongo-init/dumps/crypto_predictions/*.bson')

for file_path in bson_files:
    print(f"Importing {file_path} …")

    with open(file_path, "rb") as f:
        data = bson.decode_all(f.read())

    # Safe, cross-platform extraction of collection name
    collection_name = os.path.splitext(os.path.basename(file_path))[0]
    # → 'ohlc_ETH', 'ohlc_BTC', …

    if not collection_name:
        raise ValueError(f"Empty collection name derived from {file_path}")

    collection = db[collection_name]

    if data:
        collection.insert_many(data)
        print(f"✓ Imported {len(data)} documents to '{collection_name}'")
    else:
        print(f"⚠ No data in {file_path}")

print("Done!")
