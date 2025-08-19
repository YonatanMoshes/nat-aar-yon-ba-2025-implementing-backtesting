import numpy as np
import pandas as pd
import os
import matplotlib.pyplot as plt
from stable_baselines3 import SAC
from stable_baselines3.common.callbacks import EvalCallback, StopTrainingOnNoModelImprovement

from src.model import StockTradingEnv
from src.get_data import prepare_and_combine_data

# --- Configuration ---
TOTAL_TIMESTEPS = 1000 # 50 * 23909
EVAL_FREQ = 500 # 23909
OUTPUT_DIR = "/app/output" 
MODEL_SAVE_PATH = "Model/best_model"
TENSORBOARD_LOG_DIR = "./sac_stock_tensorboard/"


# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Training Script ---
def train_model(train_df, val_df):
    env = StockTradingEnv(train_df)
    eval_env = StockTradingEnv(val_df)

    # This callback will stop training if the eval reward does not improve for `max_no_improvement_evals`
    stop_train_callback = StopTrainingOnNoModelImprovement(
        max_no_improvement_evals=10,  # e.g., stop if no improvement after 10 evaluations
        min_evals=10,                 # e.g., wait for at least 10 evaluations before checking
        verbose=1
    )

    eval_callback = EvalCallback(eval_env,
                             best_model_save_path=OUTPUT_DIR,
                             eval_freq=EVAL_FREQ, # Check performance every 1000 steps
                             deterministic=True,
                             callback_on_new_best=stop_train_callback,
                             render=False)

    model = SAC(
        policy="MlpPolicy", 
        env=env, 
        verbose=1,
        tensorboard_log=TENSORBOARD_LOG_DIR
    )
    
    model.learn(total_timesteps=TOTAL_TIMESTEPS, callback=eval_callback)
    return model, env

# --- Test Model ---
def test_model(test_df, model):
    test_env = StockTradingEnv(test_df)

    # --- Random Policy (Corrected for Continuous Space) ----
    print("--- Running Random Policy for Comparison ---")
    obs, info = test_env.reset()
    done = False
    while not done:
        # Sample a random continuous action from the environment's action space
        action = test_env.action_space.sample() 
        obs, reward, terminated, truncated, info = test_env.step(action)
        done = terminated or truncated
    
    # We render at the end to not clutter the log, but you could render each step
    test_env.render()
    random_policy_final_value = test_env.portfolio_value 

    print("-----------------------------------------------------------")

    # --- Model Policy ----
    print("--- Running Trained SAC Policy ---")
    obs, info = test_env.reset()
    done = False
    while not done:
        # The model's prediction is already a continuous action array
        action, _states = model.predict(obs, deterministic=True)  

        # The printout will now show the float value, e.g., "Action taken: [-0.452]"
        print(f"Action taken: {action[0]:.3f}")

        obs, reward, terminated, truncated, info = test_env.step(action)
        done = terminated or truncated
        
    test_env.render()
    model_policy_final_value = test_env.portfolio_value 

    print("----------------------------------------------------------")
    print(f"Initial Balance: {test_env.initial_balance:.2f}")
    print(f"Random Policy Final Value : {random_policy_final_value:.2f}")
    print(f"Trained Model Final Value : {model_policy_final_value:.2f}")
    print("----------------------------------------------------------")

    plot_stock_and_actions(test_env, test_df)
    plot_rewards(test_env)

    return test_env

# --- Plotting Function ---
def plot_rewards(env):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    plt.figure(figsize=(12, 6))
    plt.plot(env.reward_history)
    plt.title("Reward")
    plt.xlabel("Step")
    plt.ylabel("Reward Value")
    plt.grid(True)
    plt.savefig(os.path.join(OUTPUT_DIR, "rewards.png"))
    plt.clf()

# --- Plot actions ---
def plot_stock_and_actions(env, df):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # This function works because we will add 'actions_history' to the env
    df = df.iloc[env.window_size:].reset_index(drop=True) # Align prices with env steps
    prices = df['close'].values

    plt.figure(figsize=(15, 7))
    plt.plot(prices, label="Stock Price", color='black', alpha=0.8)

    # Note: env.actions_history stores (step, action_value, price)
    buy_steps = [s - env.window_size for s, a, p in env.actions_history if a > 0]
    buy_prices = [p for s, a, p in env.actions_history if a > 0]
    plt.scatter(buy_steps, buy_prices, color='green', label='Buy', marker='^', s=100, alpha=0.9)

    sell_steps = [s - env.window_size for s, a, p in env.actions_history if a < 0]
    sell_prices = [p for s, a, p in env.actions_history if a < 0]
    plt.scatter(sell_steps, sell_prices, color='red', label='Sell', marker='v', s=100, alpha=0.9)

    plt.title("Stock Price and RL Agent's Actions")
    plt.xlabel("Step")
    plt.ylabel("Price")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "actions_vs_price.png"))
    plt.clf()

def define_env(data, initial_balance=10000, initial_shares_held=0):
    env = StockTradingEnv(df=data, initial_shares_held=initial_shares_held, initial_balance=initial_balance)

    return env

# --- Run Training ---
#if __name__ == "__main__":
def main():
    stocks_to_train = ["BTC", "ETH", "LTC"]
    start_date = "2025-01-01 00:00:00"
    end_date = "2025-07-19 07:15:00"

    full_df = prepare_and_combine_data(stocks_to_train, start_date, end_date)
    
    print("--- Verifying Cleanliness of Input DataFrame ---")
    print(full_df.describe()) # Look for huge max values, or std=0
    print("\nChecking for any NaN/Inf values...")
    print(f"NaNs present: {full_df.isnull().sum().sum()}")
    numeric_cols = full_df.select_dtypes(include=np.number)
    print(f"Infinities present: {np.isinf(numeric_cols.values).sum()}")
    print("-------------------------------------------------")

    print("Total timestamps in full dataset:", len(full_df))

    # 2. Split the data chronologically (IMPORTANT: shuffle=False)
    # 70% for train, 15% for validation, 15% for test
    train_size = int(len(full_df) * 0.7)
    val_size = int(len(full_df) * 0.15)
    
    train_df = full_df[:train_size]
    val_df = full_df[train_size : train_size + val_size]
    test_df = full_df[train_size + val_size :]

    print(f"Train size: {len(train_df)}, Val size: {len(val_df)}, Test size: {len(test_df)}")

    model, env = train_model(train_df, val_df)

    print(env.observation_space.shape)

    return model

    #model = SAC.load(MODEL_SAVE_PATH)

    #test_model(test_df, model)
