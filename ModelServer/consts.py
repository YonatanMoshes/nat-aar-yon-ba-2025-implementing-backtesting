import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
training_files_btc = os.path.join(BASE_DIR, 'btc','training_files')
training_files_btc_pct = os.path.join(BASE_DIR, 'btc_pct','training_files')
STOCK_SYMBOLS = ["BTC", "ETH", "LTC"]