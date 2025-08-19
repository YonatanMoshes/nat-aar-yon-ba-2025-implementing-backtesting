import pandas as pd
from stable_baselines3 import SAC
import os
import numpy as np
from datetime import datetime
import json

from src.environment import define_env
from src.get_data import fetch_and_prepare_single_stock
from consts import AVAILABLE_STOCKS as stocks_to_train

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "Model")
MODEL_SAVE_PATH = os.path.join(MODEL_DIR, "best_model.zip")

def run_buy_and_hold_policy(df, initial_balance=10000):
    """Simulates buying at the first price and holding until the end."""
    if df.empty:
        return initial_balance
    
    start_price = df['close'].iloc[0]
    end_price = df['close'].iloc[-1]

    print(f"first timestamp: {df['timestamp'].iloc[0]}", flush=True)
    print(f"last timestamp: {df['timestamp'].iloc[-1]}", flush=True)

    shares_bought = initial_balance / start_price
    final_value = shares_bought * end_price
    
    return final_value

def run_rl_policy(df, initial_balance=10000):
    """Simulates the trained RL agent over the historical data."""
    if len(df) < 15: # Not enough data for even one observation
        return initial_balance

    model = SAC.load(MODEL_SAVE_PATH)

    env = define_env(df, initial_balance)

    obs, info = env.reset() 
    done = False
    
    while not done:
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, info = env.step(action)
        done = terminated or truncated
        
    return env.portfolio_value

def run_xgBoost_policy(df, initial_balance=10000, threshold=5, percentage_to_act=0.1):
    """
    Simulates a simple policy based on your external XGboost classification predictions.
    Policy:
    - If max_positive_threshold > threshold and we have cash, buy with all cash.
    - If max_positive_threshold = -1 and we have stock, sell all stock.
    - Otherwise, hold.
    """

    BIGGEST_THRESHOLD = 8

    if df.empty:
        return initial_balance

    balance = initial_balance
    shares_held = 0

    for i, row in df.iterrows():
        current_price = row['close']
        prediction = row['max_positive_threshold']

        if prediction >= threshold and balance > 0:
            # Buy Signal
            shares_to_buy = (percentage_to_act * balance) / current_price
            shares_held += shares_to_buy
            balance -= shares_to_buy * current_price
        elif prediction <= (BIGGEST_THRESHOLD - threshold) and shares_held > 0:
            # Sell Signal
            shares_to_sell = percentage_to_act * shares_held
            balance += shares_to_sell * current_price
            shares_held -= shares_to_sell
        # Else: Hold

    # Final value is whatever cash is left plus the value of shares held at the end
    final_value = balance + (shares_held * df['close'].iloc[-1])

    return final_value

def run_lstm_policy(df, initial_balance=10000, threshold=0.002):
    """
    Simulates a simple policy based on your external LSTM regression predictions.
    Policy:
    - If pct_prediction > threshold and we have cash, buy with all cash.
    - If pct_prediction < -threshold and we have stock, sell all stock.
    - Otherwise, hold.
    """
    if df.empty:
        return initial_balance

    balance = initial_balance
    shares_held = 0

    for i, row in df.iterrows():
        current_price = row['close']
        prediction = row['pct_prediction']

        if prediction > threshold and balance > 0:
            # Buy Signal
            shares_to_buy = balance / current_price
            shares_held += shares_to_buy
            balance = 0
        elif prediction < -threshold and shares_held > 0:
            # Sell Signal
            balance += shares_held * current_price
            shares_held = 0
        # Else: Hold

    # Final value is whatever cash is left plus the value of shares held at the end
    final_value = balance + (shares_held * df['close'].iloc[-1])
    return final_value

############### Helper Functions #################### 

def analyze_model_edge(df):
    """
    Analyzes if the model's predictions have a real predictive edge.
    It groups predictions into quantiles and checks the actual future returns.
    """
    if 'pct_prediction' not in df.columns or df['max_positive_threshold'].nunique() < 2:
        print("Not enough data to analyze model edge.")
        return

    # For simplicity, let's look at the next period's return as the 'actual' outcome
    df['actual_future_return'] = df['close'].pct_change(1).shift(-1)
    df.dropna(inplace=True)
    
    print("\n--- Model Prediction Edge Analysis ---")
    print("This table shows the average actual future return for each prediction signal.")
    print("A good model shows a clear, rising trend (higher signal = higher return).\n")

    # Group by the signal and calculate the mean of the actual returns
    edge_analysis = df.groupby('max_positive_threshold')['actual_future_return'].mean().reset_index()
    edge_analysis['avg_actual_return_bps'] = edge_analysis['actual_future_return'] * 10000 # In basis points
    
    print(edge_analysis[['max_positive_threshold', 'avg_actual_return_bps']].to_string(index=False))
    print("\n" + "="*40)

def find_best_strategy_params(df, initial_balance=10000):
    """
    This function runs the optimization loop ONLY on the validation data.
    """
    best_params = {'threshold': None, 'percentage': None}
    max_final_value = 0

    print("\n--- Optimizing Strategy on VALIDATION Data ---")
    for threshold in range(0, 9):
        for percentage in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
            # This is your simple policy function, we just pass params to it now
            final_value = run_xgBoost_policy(
                df, initial_balance, threshold, percentage
            )
            if final_value > max_final_value:
                max_final_value = final_value
                best_params['threshold'] = threshold
                best_params['percentage'] = percentage

    print(f"Optimal parameters found: {best_params} with value {max_final_value:,.2f}")
    return best_params

def save_best_strategy_params():
    print(f">>> Trying To Create The File. <<<", flush=True)

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(BASE_DIR, 'strategy_config.json')

    start_date = "2025-01-01 00:00:00"
    end_date = "2025-06-29 09:20:00"

    full_strategy_config = {}

    for stock in stocks_to_train:
        full_df = fetch_and_prepare_single_stock(start_date, end_date, stock)

        best_xgboost_params = find_best_strategy_params(full_df)

        full_strategy_config[stock] = {
            "xgboost_policy": best_xgboost_params
        }

    with open(config_path, 'w') as f:
        # json.dump() is the function that does the writing.
        # indent=4 makes the file human-readable.
        json.dump(full_strategy_config, f, indent=4) 
    print("Successfully saved strategy configuration.")

    return full_strategy_config