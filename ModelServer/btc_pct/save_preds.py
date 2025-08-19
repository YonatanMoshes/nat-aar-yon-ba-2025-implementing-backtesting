import pandas as pd
from pymongo import MongoClient
from consts import training_files_btc_pct
import os

MONGO_URI = os.environ.get('CONNECTION_STRING', 'mongodb://localhost:27017/')
MONGO_DATABASE_NAME = os.environ.get('DATABASE_NAME', 'crypto_predictions')

def save_predictions(y_preds, ticker):

    df = pd.read_csv(f"{training_files_btc_pct}/timestamps_{ticker}.csv", header=None, skiprows=1)
    timestamps = df.iloc[:, 2].values
    
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DATABASE_NAME]
    collection = db[f"pct_{ticker}"]

    docs = [
    {"timestamp": ts, "prediction": pred}
    for ts, pred in zip(timestamps, y_preds)
    ]
    
    collection.insert_many(docs)