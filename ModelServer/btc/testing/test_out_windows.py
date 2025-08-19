import pandas as pd
from pymongo import MongoClient
from dateutil import parser
import matplotlib.pyplot as plt
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from create_indicators import define_target


ticker = sys.argv[1]
# === Connect to MongoDB ===
client = MongoClient("mongodb://localhost:27017/")
db = client["crypto_predictions"]
collection = db[f"binary_{ticker}"]

# === Load CSV with prices ===
price_df = pd.read_csv(f"../training_files/{ticker}_24k.csv", parse_dates=["timestamp"])
price_df = define_target(price_df)

price_df.set_index("timestamp", inplace=True)
price_df.sort_index(inplace=True)
price_orig = pd.read_csv(f"../training_files/{ticker}_24k.csv")

price_orig = define_target(price_orig)
timestamps = price_df.index.to_list()



# Loop over each prediction threshold
for threshold in [3, 5]:  # assuming thresholds 0 to 6
    print(f"\nEvaluating threshold {threshold}...")

    # === Sliding Window Stats ===
    accuracies = []
    precisions = []
    recalls = []
    window_size = 20

    window_correct_acc = 0
    window_total_acc = 0

    window_tp = 0
    window_tn = 0
    window_pred_pos = 0
    window_actual_neg = 0

    # === Global Stats ===
    tp = 0
    fp = 0
    fn = 0
    tn = 0
    total_1 = 0
    total_1_pred = 0
    total_0 = 0
    total_0_pred = 0

    ts1 = "2025-06-21 00:00:00"
    ts2 = "2025-06-22 08:00:00"

# Query: find documents where timestamp >= timestamp1 and < timestamp2
    cursor = collection.find({
        "timestamp": {
            "$gte": ts1,
            "$lt": ts2
        }
    })

    for doc in cursor:
        try:
            pred_ts = parser.parse(doc["timestamp"])
        except Exception:
            continue

        try:
            prediction = doc[f"prediction_threshold_{threshold}"]
            current_idx = timestamps.index(pred_ts)
            actual = price_orig.iloc[current_idx]["Target"]
            if price_orig.iloc[current_idx]["timestamp"] != doc["timestamp"]:
                print(f"Index: {current_idx}")
                break


            # Count total actuals
            if actual == 1:
                total_1 += 1
            else:
                total_0 += 1

            # Count predicted values
            if prediction == 1:
                total_1_pred += 1
            else:
                total_0_pred += 1

            # === Global metrics ===
            if prediction == 1:
                if actual == 1:
                    tp += 1
                else:
                    fp += 1
            elif prediction == 0:
                if actual == 0:
                    tn += 1
                else:
                    fn += 1

            # === Sliding window metrics ===
            window_total_acc += 1
            if prediction == actual:
                window_correct_acc += 1

            if prediction == 1:
                window_pred_pos += 1
                if actual == 1:
                    window_tp += 1

            if prediction == 0:
                window_actual_neg += 1
                if actual == 0:
                    window_tn += 1

            # Evaluate window
            if window_total_acc == window_size:
                accuracies.append(window_correct_acc / window_total_acc)
                if window_pred_pos > 0:
                    precisions.append(window_tp / window_pred_pos)
                if window_actual_neg > 0:
                    recalls.append(window_tn / window_actual_neg)

                # Reset window counters
                window_correct_acc = 0
                window_total_acc = 0
                window_tp = 0
                window_tn = 0
                window_pred_pos = 0
                window_actual_neg = 0

        except KeyError:
            print(f"Threshold field missing: prediction_threshold_{threshold}")
        except ValueError as e:
            print(f"Timestamp not found: {pred_ts} — Error: {e}")
        except Exception as e:
            print(f"Error at {pred_ts}: {e}")

    # === Print Summary ===
    print(f"Threshold {threshold}:")
    print(f"  Avg Accuracy:  {sum(accuracies)/len(accuracies):.4f}" if accuracies else "  No accuracy data")
    print(f"  Avg Precision for 1: {sum(precisions)/len(precisions):.4f}" if precisions else "  No precision data")
    print(f"  Avg Precision for 0:    {sum(recalls)/len(recalls):.4f}" if recalls else "  No recall data")


    # Global metrics
    global_precision = tp / (tp + fp) if (tp + fp) else 0
    global_recall = tn / (tn + fn) if (tn + fn) else 0

    print(f"  Global Precision for 1: {global_precision:.4f}")
    print(f"  Global Precision for 0:    {global_recall:.4f}")
    print(f"  total 1s: {total_1} vs predicted: {total_1_pred}")
    print(f"  total 0s: {total_0} vs predicted: {total_0_pred}")

    
    import numpy as np

    # === Compute Cumulative Averages ===
    def cumulative_average(lst):
        return np.cumsum(lst) / np.arange(1, len(lst) + 1)

    cumulative_acc = cumulative_average(accuracies) if accuracies else []
    cumulative_prec = cumulative_average(precisions) if precisions else []
    cumulative_recall = cumulative_average(recalls) if recalls else []
    # === Plot Metrics Over Time ===
    plt.figure(figsize=(12, 4))

    # Accuracy
    plt.subplot(1, 3, 1)
    plt.plot(cumulative_acc, label="Accuracy", color="skyblue")
    plt.title(f"Accuracy over Time (Threshold {threshold})")
    plt.xlabel("Window Index")
    plt.ylabel("Accuracy")
    plt.ylim(0, 1)
    plt.grid(True)

    # Precision
    plt.subplot(1, 3, 2)
    plt.plot(cumulative_prec, label="Precision", color="orange")
    plt.title(f"Precision over Time (Threshold {threshold})")
    plt.xlabel("Window Index")
    plt.ylabel("Precision")
    plt.ylim(0, 1)
    plt.grid(True)

    # Recall
    plt.subplot(1, 3, 3)
    plt.plot(cumulative_recall, label="Recall", color="green")
    plt.title(f"Recall over Time (Threshold {threshold})")
    plt.xlabel("Window Index")
    plt.ylabel("Recall")
    plt.ylim(0, 1)
    plt.grid(True)

    plt.tight_layout()
    plt.suptitle(f"Performance Metrics Over Time — Threshold {threshold}", y=1.05, fontsize=14)

    """
    # Optional: save to file
    plt.savefig(f"temp/metrics_threshold_{threshold}_{ticker}.png", bbox_inches="tight")
    # Or show the plot if running in interactive environment
    """
    plt.show()
    


