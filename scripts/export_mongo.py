import os
import bson
from pymongo import MongoClient

# This script will be run INSIDE a container, so it connects to 'mongo'
MONGO_URI = 'mongodb://mongo:27017/'
DB_NAME = 'crypto_predictions'
# This path matches the volume mount we added to the mongo service
EXPORT_DIR = f"/dumps/{DB_NAME}" 

def export_database():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Ensure the export directory exists
    os.makedirs(EXPORT_DIR, exist_ok=True)
    
    collection_names = db.list_collection_names()
    print(f"Found {len(collection_names)} collections...")

    for name in collection_names:
        print(f"  Exporting '{name}'...")
        collection = db[name]
        documents = list(collection.find({}))
        
        if documents:
            filename = os.path.join(EXPORT_DIR, f"{name}.bson")
            try:
                with open(filename, 'wb') as f:
                    for doc in documents:
                        f.write(bson.encode(doc))
                print(f"  ✓ Exported {len(documents)} documents to {filename}")
            except Exception as e:
                print(f"  ✗ FAILED to write to {filename}: {e}")
        else:
            print(f"  ⚠ Collection '{name}' is empty, skipping.")

    print("\nAll collections exported!")

if __name__ == "__main__":
    export_database()