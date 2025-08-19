import bson
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['crypto_predictions']

# Get all collection names
collection_names = db.list_collection_names()
print(f"Found {len(collection_names)} collections: {collection_names}")

# Export each collection
for collection_name in collection_names:
    print(f"Exporting {collection_name}...")
    
    collection = db[collection_name]
    
    # Get all documents
    documents = list(collection.find())
    
    if documents:
        # Write to BSON file (named after collection)
        filename = f"../../mongo-init/dumps/crypto_predictions/{collection_name}.bson"
        with open(filename, 'wb') as f:
            for doc in documents:
                f.write(bson.encode(doc))
        
        print(f"✓ Exported {len(documents)} documents to {filename}")
    else:
        print(f"⚠ No documents in {collection_name}")

print("All collections exported!")