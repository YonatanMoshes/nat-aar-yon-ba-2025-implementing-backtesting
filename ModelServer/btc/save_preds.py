import pandas as pd
from pymongo import MongoClient
from consts import training_files_btc
import os

MONGO_URI = os.environ.get('CONNECTION_STRING', 'mongodb://localhost:27017/')
MONGO_DATABASE_NAME = os.environ.get('DATABASE_NAME', 'crypto_predictions')

def save_predictions(y_preds, ticker):

    df = pd.read_csv(f"{training_files_btc}/timestamps_{ticker}.csv", header=None, skiprows=1)
    timestamps = df.iloc[:, 2].values

    thresholds = len(y_preds)
    num_preds = len(y_preds[0])
    
    #print("Timestamps:", len(timestamps))
    #print("Num thresholds:", thresholds)
    #print("Predictions per thresh:", num_preds)
    
    if any(len(model_preds) != len(timestamps) for model_preds in y_preds):
        raise ValueError("Mismatch between predictions and timestamps length")


    client = MongoClient(MONGO_URI)
    db = client[MONGO_DATABASE_NAME]
    collection = db[f"binary_{ticker}"]

    documents = []
    for i in range(len(timestamps)):
        doc = {"timestamp": timestamps[i]}
        for threshold, model_preds in enumerate(y_preds):
            doc[f"prediction_threshold_{threshold}"] = int(model_preds[i])
        documents.append(doc)

    collection.insert_many(documents)