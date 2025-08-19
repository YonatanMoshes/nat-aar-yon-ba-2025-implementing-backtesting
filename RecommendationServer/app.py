import sys, os
from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO
from celery import Celery, Task
import json

from src.recommendation import recommend
from src.get_data import fetch_and_prepare_single_stock
from src.backtest_engine import run_buy_and_hold_policy, run_rl_policy, run_xgBoost_policy, run_lstm_policy, save_best_strategy_params
from consts import final_feature_columns, AVAILABLE_STOCKS

# =================================================================
# 0. Pre Loading Policies Best Params
# =================================================================

STRATEGY_CONFIG = None
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'src', 'strategy_config.json')

try:
    print(f">>> Attempting to load strategy config from: {CONFIG_PATH}", flush=True)
    with open(CONFIG_PATH, 'r') as f:
        STRATEGY_CONFIG = json.load(f)
    print(">>> Strategy config loaded successfully from file. <<<", flush=True)

except FileNotFoundError:
    print(f"!!! WARNING: Config file not found at {CONFIG_PATH}. Generating a new one now...", flush=True)
    print("!!! This may take up to a minute. The service will be unresponsive during this time. !!!", flush=True)
    
    try:
        STRATEGY_CONFIG = save_best_strategy_params()

    except Exception as e:
        print(f"!!! FATAL ERROR: Failed during on-demand config generation. Reason: {e} !!!", flush=True)
        # We exit here because the service cannot function without the config.
        sys.exit(1)

except Exception as e:
    # This catches other errors like JSON decoding errors, permission errors etc.
    print(f"!!! FATAL ERROR: Could not load or parse config file. Reason: {e} !!!", flush=True)
    sys.exit(1)

# A final check to ensure the config was loaded one way or another
if STRATEGY_CONFIG is None:
    print("!!! FATAL ERROR: Strategy config is still None after startup. Exiting. !!!", flush=True)
    sys.exit(1)

# =================================================================
# 1. FLASK, CELERY, SOCKET.IO INITIALIZATION
# =================================================================
def celery_init_app(app: Flask) -> Celery:
    class FlaskTask(Task):
        def __call__(self, *args: object, **kwargs: object) -> object:
            with app.app_context():
                return self.run(*args, **kwargs)
    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object(app.config["CELERY"])
    celery_app.set_default()
    return celery_app

app = Flask(__name__)
CORS(app)

# Configure Celery to use the shared Redis broker
app.config.from_mapping(
    CELERY=dict(
        broker_url=os.environ.get("CELERY_BROKER_URL"),
        result_backend=os.environ.get("CELERY_RESULT_BACKEND"),
        task_ignore_result=True, # We send results via Socket.IO, not the backend
        task_routes={
            'app.generate_recommendation_task': {'queue': 'recommendation_queue'},
            'app.run_backtest_task': {'queue': 'recommendation_queue'},
        },
    ),
)

# Initialize Socket.IO
socketio = SocketIO(app, message_queue=os.environ.get("CELERY_BROKER_URL"), cors_allowed_origins="*", async_mode='eventlet')
celery = celery_init_app(app)

print("RECOMMENDATION-SERVICE: Initializing...", flush=True)


# =================================================================
# 2. DEFINE THE CELERY BACKGROUND TASK
# =================================================================
@celery.task(bind=True)
def generate_recommendation_task(self, stock_symbol, initial_balance, initial_shares_held, user_sid):
    """
    This background task runs in the worker process. It performs the slow
    recommendation logic and emits the result directly back to the user.
    """
    print(f"WORKER: Starting recommendation for {stock_symbol} with initial balnce of: {initial_balance} and initial stock share of: {initial_shares_held} (Task ID: {self.request.id})", flush=True)
    try:
        recommendation_result = recommend(stock_symbol, initial_balance, initial_shares_held)
        
        if recommendation_result is None:
            raise ValueError("The recommend() function returned None, indicating a data or processing error.")
            
        print(f"WORKER: Success for {stock_symbol}. Emitting result to SID {user_sid}", flush=True)
        socketio.emit('recommendation_result', {
            'status': 'success',
            'data': recommendation_result
        }, room=user_sid)

        return {'status': 'success'}

    except Exception as e:
        print(f"WORKER: FAILED for {stock_symbol}. Reason: {e}", flush=True)
        socketio.emit('recommendation_result', {
            'status': 'error',
            'message': str(e)
        }, room=user_sid)
        raise

@celery.task(bind=True)
def run_backtest_task(self, stock, start_date, end_date, user_sid):
    """Celery task to run the full backtest simulation."""
    print(f"BACKTEST WORKER: Starting for {stock} (Task ID: {self.request.id})", flush=True)
    try:
        raw_df = fetch_and_prepare_single_stock(start_date, end_date, stock=stock)
        rl_df = raw_df.reindex(columns=final_feature_columns).dropna().reset_index(drop=True)

        if rl_df.empty:
            raise ValueError("Not enough data for the selected range after cleaning.")

        initial_balance = 10000
        buy_and_hold_result = run_buy_and_hold_policy(raw_df.copy(), initial_balance)
        rl_policy_result = run_rl_policy(rl_df.copy(), initial_balance)

        # Get the pre-optimized parameters for the XGBoost policy
        stock_params = STRATEGY_CONFIG[stock]
        xgb_params = stock_params.get('xgboost_policy')
        if not xgb_params:
            raise ValueError("XGBoost strategy parameters not found in config.")

        xgboost_policy_result = run_xgBoost_policy(
            raw_df.copy(), 
            initial_balance,
            threshold=xgb_params['threshold'],
            percentage_to_act=xgb_params['percentage'])
        
        lstm_policy_result = run_lstm_policy(raw_df.copy(), initial_balance)
        
        results = {
            "initialBalance": initial_balance,
            "buyAndHold": {
                "finalValue": buy_and_hold_result,
                "profit": buy_and_hold_result - initial_balance
            },
            "rlPolicy": {
                "finalValue": rl_policy_result,
                "profit": rl_policy_result - initial_balance
            },
            "xgPolicy": {
                "finalValue": xgboost_policy_result,
                "profit": xgboost_policy_result - initial_balance
            },
            "lstmPolicy": {
                "finalValue": lstm_policy_result,
                "profit": lstm_policy_result - initial_balance
            }
        }
        
        print(f"BACKTEST WORKER: Success for {stock}. Emitting result to {user_sid}", flush=True)
        socketio.emit('backtest_result', {'status': 'success', 'data': results}, room=user_sid)
        return {'status': 'success'}

    except Exception as e:
        print(f"BACKTEST WORKER: FAILED for {stock}. Reason: {e}", flush=True)
        socketio.emit('backtest_result', {'status': 'error', 'message': str(e)}, room=user_sid)
        raise

# =================================================================
# 3. DEFINE THE SOCKET.IO EVENT HANDLER
# =================================================================
@socketio.on('request_recommendation')
def handle_recommendation_request(data):
    """
    This runs in the Flask/Gunicorn process. It's a lightweight handler that
    receives the request and immediately delegates it to a Celery worker.
    """
    user_sid = request.sid
    print(f"FLASK: Received 'request_recommendation' from SID {user_sid} for data: {data}", flush=True)
    
    stock = data.get('stock')
    if not stock:
        socketio.emit('recommendation_result', {'status': 'error', 'message': 'Stock symbol missing.'}, room=user_sid)
        return
    
    initial_balance = data.get('initial_balance')
    if initial_balance is None:
        socketio.emit('recommendation_result', {'status': 'error', 'message': 'initial_balance missing.'}, room=user_sid)
        return
    
    initial_shares_held = data.get('initial_shares_held')
    if initial_shares_held is None:
        socketio.emit('recommendation_result', {'status': 'error', 'message': 'initial_shares_held missing.'}, room=user_sid)
        return

    # Delegate the slow work to the background worker
    generate_recommendation_task.delay(stock.upper(), initial_balance, initial_shares_held, user_sid)

    # Immediately acknowledge the request to the frontend
    socketio.emit('recommendation_pending', {'message': f'Recommendation for {stock} is being generated...'})

@socketio.on('request_backtest')
def handle_backtest_request(data):
    user_sid = request.sid
    print(f"FLASK: Received 'request_backtest' from SID {user_sid} for data: {data}", flush=True)
    
    stock = data.get('stock')
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    if not all([stock, start_date, end_date]):
        socketio.emit('backtest_result', {'status': 'error', 'message': 'Missing parameters.'}, room=user_sid)
        return
        
    # Delegate to the worker
    run_backtest_task.delay(stock, start_date, end_date, user_sid)
    
    socketio.emit('backtest_pending', {'message': f'Backtest for {stock} has started...'})

@socketio.on('connect')
def handle_connect():
    print('RECOMMENDATION-SERVICE: Client connected.', flush=True)