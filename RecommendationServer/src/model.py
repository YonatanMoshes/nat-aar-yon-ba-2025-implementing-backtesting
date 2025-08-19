import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pandas as pd

from consts import WINDOW_SIZE

class StockTradingEnv(gym.Env):
    """
    A stock trading environment for RL agents, based on the specifications
    in arXiv:2506.04358.

    This version uses the paper's hybrid reward function, combining Profit/Loss
    with the Sharpe Ratio to encourage risk-adjusted returns.
    """
    metadata = {'render_modes': ['human']}

    def __init__(self, df, window_size=WINDOW_SIZE, initial_shares_held=0, initial_balance=10000, risk_free_rate=0.0):
        super(StockTradingEnv, self).__init__()

        # --- Data and Parameters ---
        if 'close' not in df.columns:
            raise ValueError("DataFrame must contain a 'close' column.")
            
        self.df = df.select_dtypes(include=[np.number]).astype(np.float64).reset_index(drop=True)
        self.window_size = window_size
        self.initial_balance = initial_balance
        self.initial_shares_held = initial_shares_held
        self.risk_free_rate = risk_free_rate # For Sharpe Ratio calculation

        # --- Action & Observation Spaces ---
        self.action_space = spaces.Box(low=-1, high=1, shape=(1,), dtype=np.float32)
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf,
            shape=(self.window_size * self.df.shape[1] + 2,),
            dtype=np.float32
        )
        
        # Initialize history lists for plotting and reward calculation
        self.actions_history = []
        self.reward_history = []
        self.portfolio_returns_history = []

    def reset(self, *, seed=None, options=None, mode='train'):
        super().reset(seed=seed)
        
        self.balance = self.initial_balance
        self.shares_held = self.initial_shares_held

        if mode == 'live':
            # For live recommendations, start at the very END of the DataFrame
            self.current_step = len(self.df) 
        else:
            # For training/backtesting, start at the beginning
            self.current_step = self.window_size

        current_price = self.df.iloc[self.current_step - 1]['close']
        self.portfolio_value = self.initial_balance + self.initial_shares_held * current_price

        # Reset history lists for each new episode
        self.actions_history = []
        self.reward_history = []
        # Initialize with zeros to have a full list from the start for std dev calculation
        self.portfolio_returns_history = [0] * self.window_size 

        observation = self._next_observation()
        info = {'initial_portfolio_value': self.initial_balance}
        
        return observation, info

    def _next_observation(self):
        if self.current_step < self.window_size:
            print(f"WARNING: _next_observation called with current_step ({self.current_step}) < window_size ({self.window_size}). This can happen at the start of an episode. Returning a zero observation.", flush=True)
            # Return a zero vector that matches the observation space shape
            return np.zeros(self.observation_space.shape, dtype=np.float32)
    
        frame = self.df.iloc[self.current_step - self.window_size : self.current_step]
        normalized_frame = (frame - frame.mean()) / (frame.std() + 1e-6)
        obs = normalized_frame.values.flatten()
        
        normalized_balance = self.balance / self.portfolio_value if self.portfolio_value > 0 else 0

        last_price_in_window = self.df.iloc[self.current_step - 1]['close']
        shares_ratio = (self.shares_held * last_price_in_window) / self.portfolio_value if self.portfolio_value > 0 else 0
        
        obs = np.append(obs, [normalized_balance, shares_ratio])
        
        if np.isnan(obs).any() or np.isinf(obs).any():
            print("!!! Invalid value detected in observation !!!")
            print(obs)
            # This will crash the program here, so you know exactly when it happened.
            raise ValueError("NaN or Inf in observation vector")

        return obs.astype(np.float32)

    def step(self, action):
        if self.current_step >= len(self.df) - 1:
            last_obs = self._next_observation()
            return last_obs, 0.0, True, False, {}
        
        trade_amount_percent = action[0]
        prev_portfolio_value = self.portfolio_value
        current_price = self.df.iloc[self.current_step]['close']
        
        # Execute trade
        if trade_amount_percent > 0:
            amount_to_spend = self.balance * trade_amount_percent
            shares_to_buy = amount_to_spend / current_price
            self.balance -= amount_to_spend
            self.shares_held += shares_to_buy
        elif trade_amount_percent < 0:
            proportion_to_sell = abs(trade_amount_percent)
            shares_to_sell = self.shares_held * proportion_to_sell
            amount_received = shares_to_sell * current_price
            self.balance += amount_received
            self.shares_held -= shares_to_sell

        self.actions_history.append((self.current_step, trade_amount_percent, current_price))
            
        self.current_step += 1
        done = self.current_step >= len(self.df) - 1

        next_price = self.df.iloc[self.current_step]['close'] if not done else current_price
        self.portfolio_value = self.balance + (self.shares_held * next_price)
        
        # --- Calculate Hybrid Reward (PnL + Sharpe Ratio) ---
        # 1. PnL (Profit and Loss) component
        pnl = self.portfolio_value - prev_portfolio_value
        
        # 2. Risk-adjusted (Sharpe Ratio) component
        portfolio_return = (self.portfolio_value / prev_portfolio_value) - 1 if prev_portfolio_value > 0 else 0
        self.portfolio_returns_history.append(portfolio_return)
        
        if len(self.portfolio_returns_history) > self.window_size:
            self.portfolio_returns_history.pop(0)

        returns_std = np.std(self.portfolio_returns_history)
        
        sharpe_ratio = 0
        if returns_std > 1e-6:
            # Simplified Sharpe Ratio for the reward signal
            sharpe_ratio = (portfolio_return - self.risk_free_rate) / returns_std
            
        # Combine PnL and Sharpe ratio for the final reward
        # The weight balances immediate profit vs. risk-adjusted consistency
        reward = pnl + sharpe_ratio * 0.1
        self.reward_history.append(reward)

        if self.portfolio_value < self.initial_balance * 0.5:
            done = True
            reward -= 1000

        truncated = False
        return self._next_observation(), reward, done, truncated, {}

    def render(self, mode='human'):
        render_step = min(self.current_step, len(self.df) - 1)
        profit = self.portfolio_value - self.initial_balance
        profit_percent = (profit / self.initial_balance) * 100
        print(
            f"Step: {render_step:4} | "
            f"Price: {self.df.iloc[render_step]['close']:8.2f} | "
            f"Portfolio: {self.portfolio_value:10.2f} | "
            f"Profit: {profit:10.2f} ({profit_percent:5.2f}%)"
        )