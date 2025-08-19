import os
from stable_baselines3 import SAC

from src.get_data import get_data_for_recommendation
from src.environment import define_env

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "Model")
MODEL_SAVE_PATH = os.path.join(MODEL_DIR, "best_model.zip")

def recommend(stock_symbol, initial_balance, initial_shares_held):
    """
    Generates a recommendation for a specific stock symbol.
    """

    model = SAC.load(MODEL_SAVE_PATH)

    data = get_data_for_recommendation(stock_symbol)

    print(f"Fetched data for {stock_symbol}: {data}")
   
    if data is None:
        return None

    # Creating an environment
    recommendation_env = define_env(data, initial_balance, initial_shares_held)

    # mode = 'live' means that the model will make a prediction for the last timestamp in data.
    obs, info = recommendation_env.reset(mode='live')

    # Getting the prediction from the model
    action, _states = model.predict(obs, deterministic=True)  

    action = action[0]

    direction = -1 if action < 0 else 1 if action > 0 else 0
    pct = abs(action) * 100  # Convert action to percentage

    recommendation = {
        "stock_symbol": stock_symbol,
        "direction": direction,
        "pct": float(pct),
        "action": "BUY" if direction == 1 else "SELL" if direction == -1 else "HOLD",
    }

    return recommendation