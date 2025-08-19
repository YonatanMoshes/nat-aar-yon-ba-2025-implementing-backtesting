import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# import threading
# import time
import redis
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room 
from celery import Celery, Task, chord
from datetime import datetime, timedelta, timezone

from btc.update_preds import update_btc
from btc_pct.update_preds import update_btc_pct
from converters.addOHLC import sync_ohlc_data
from consts import STOCK_SYMBOLS

# =================================================================
# 1. CELERY, REDIS AND FLASK APP INITIALIZATION
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
CORS(app) # Enable CORS for all routes

app.config.from_mapping(
    CELERY=dict(
        broker_url=os.environ.get("CELERY_BROKER_URL"),
        result_backend=os.environ.get("CELERY_RESULT_BACKEND"),
        task_ignore_result=False,
        beat_schedule={
            'meta-scheduler-every-minute': {
                'task': 'app.run_meta_scheduler',
                'schedule': 60.0,  # Run every 60 seconds
            },
        },
        task_routes={
            'app.orchestrate_update_workflow': {'queue': 'model_queue'},
            'app.update_btc_task': {'queue': 'model_queue'},
            'app.update_btc_pct_task': {'queue': 'model_queue'},
            'app.sync_and_notify_task': {'queue': 'model_queue'},
            'app.run_meta_scheduler': {'queue': 'model_queue'},
            'app.start_update_workflow_safely': {'queue': 'model_queue'},
        },
    ),
)

socketio = SocketIO(app, message_queue=os.environ.get("CELERY_BROKER_URL"), cors_allowed_origins="*", async_mode='eventlet')
celery = celery_init_app(app)
redis_client = redis.Redis.from_url(os.environ.get("REDIS_URL"), decode_responses=True)

try:
    redis_client.ping()
    print("Model Server: Successfully connected to Redis.")
except redis.exceptions.ConnectionError as e:
    print(f"Model Server: Could not connect to Redis: {e}", file=sys.stderr)

# =================================================================
# 2. DEFINE THE BACKGROUND TASK 
# =================================================================
# def renew_lock(stop_watchdog: threading.Event, symbol: str):
#     """
#     This function runs in a separate thread.
#     This function is responsible for renewing the lock periodically
#     while the long-running task is executing.
#     """
#     LOCK_RENEWAL_INTERVAL = 300  # 5 minutes in seconds
#     lock_key = f'lock:stock:{symbol}'

#     while not stop_watchdog.is_set():
#         try:
#             print(f"WATCHDOG for {symbol}: Renewing lock '{lock_key}' for another {LOCK_RENEWAL_INTERVAL * 2} seconds.")
#             if not redis_client.set(lock_key, "worker-alive", ex=LOCK_RENEWAL_INTERVAL * 2, xx=True):
#                 print(f"WATCHDOG for {symbol}: FAILED to renew lock. It may have expired or been deleted. Stopping watchdog.")
#                 break 
#         except Exception as e:
#             print(f"WATCHDOG for {symbol}: Error renewing lock: {e}")
#             break 
        
#         stop_watchdog.wait(timeout=LOCK_RENEWAL_INTERVAL)

@celery.task
def update_btc_task(symbol: str):
    """Celery task to train the binary classification model."""
    print(f"WORKER: Starting update_btc for {symbol}", flush=True)
    update_btc(symbol, redis_client)
    return {'status': 'success', 'model': 'binary'}

@celery.task
def update_btc_pct_task(symbol: str):
    """Celery task to train the percentage regression model."""
    print(f"WORKER: Starting update_btc_pct for {symbol}", flush=True)
    update_btc_pct(symbol, redis_client)
    return {'status': 'success', 'model': 'percentage'}


@celery.task
def sync_and_notify_task(results, symbol: str):
    """
    CALLBACK TASK: Runs after parallel tasks finish. It handles the final
    data sync, notifies the client, and releases the lock.
    """
    print(f"WORKER: Model updates for {symbol} complete. Results: {results}", flush=True)
    print(f"WORKER: Running final sync and notifying client.", flush=True)
    
    lock_key = f'lock:stock:{symbol}'
    room_name = f'stock:{symbol}'

    try:
        sync_ohlc_data([symbol])
        socketio.emit('data_update_complete', {'status': 'success', 'stock': symbol}, room=room_name)
    except Exception as e:
        print(f"ERROR in sync_and_notify_task for {symbol}: {e}", flush=True)
        socketio.emit('data_update_failed', {'status': 'error', 'stock': symbol, 'message': f'Final sync failed: {e}'}, room=room_name)
    finally:
        # This is the true end of the process, so we release the lock here.
        redis_client.delete(lock_key)
        print(f"WORKER: Released lock for {symbol}", flush=True)
    
    return {'status': 'final_sync_complete'}

@celery.task
def orchestrate_update_workflow(symbol: str):
    """
    This task sets up and launches the parallel training workflow.
    It doesn't do any heavy lifting itself.
    """
    print(f"ORCHESTRATOR: Kicking off parallel update for {symbol}", flush=True)
    
    # The chord consists of a group of tasks to run in parallel (the header),
    # and a callback task to run after they are all done.
    header = [update_btc_task.s(symbol), update_btc_pct_task.s(symbol)]
    callback = sync_and_notify_task.s(symbol=symbol)
    
    # Launch the workflow
    chord(header)(callback)
    return {'status': 'workflow_started'}

@celery.task
def start_update_workflow_safely(symbol: str, triggered_by: str = "unknown"):
    """
    This is the SINGLE entry point for starting a new update workflow.
    It handles lock acquisition and returns a status immediately.
    """
    print(f"ATTEMPTING to start workflow for {symbol} (triggered by {triggered_by})", flush=True)
    lock_key = f'lock:stock:{symbol}'
    
    if redis_client.set(lock_key, triggered_by, nx=True):
        print(f"Lock ACQUIRED for {symbol}. Starting the orchestrator.", flush=True)
        orchestrate_update_workflow.delay(symbol)
        return 'started' # Return a simple string status
    else:
        print(f"Lock for {symbol} is already held. Skipping.", flush=True)
        return 'skipped_locked' # Return a different status

@celery.task
def run_meta_scheduler():
    """
    This task is run by Celery Beat every minute.
    Its job is to check Redis for any active schedules and run them if it's time.
    """
    print(f"[{datetime.now(timezone.utc)}] Meta-scheduler checking for jobs...")
    for stock in STOCK_SYMBOLS:
        schedule_key = f'schedule:{stock}'
        if not redis_client.exists(schedule_key):
            continue

        # Fetch schedule details from Redis hash
        schedule_details = redis_client.hgetall(schedule_key)
        is_active = schedule_details.get('is_active') == 'true'
        interval_minutes = int(schedule_details.get('interval_minutes', 0))
        last_run_str = schedule_details.get('last_run_iso')

        if not is_active or interval_minutes == 0:
            continue

        should_run = False
        if not last_run_str:
            # If it's never been run, run it now.
            should_run = True
            print(f"Scheduler: '{stock}' has a new schedule. Running for the first time.")
        else:
            last_run_time = datetime.fromisoformat(last_run_str)
            if datetime.now(timezone.utc) >= last_run_time + timedelta(minutes=interval_minutes):
                should_run = True
                print(f"Scheduler: Interval of {interval_minutes} min for '{stock}' has passed. Triggering job.")

        if should_run:
            start_update_workflow_safely.delay(stock, triggered_by="scheduler")
            redis_client.hset(schedule_key, 'last_run_iso', datetime.now(timezone.utc).isoformat())

# =================================================================
# 3. DEFINE THE FLASK ROUTE 
# =================================================================

@socketio.on('start_update_process')
def handle_update_request(data):
    """
    This handler calls the starter task and WAITS for its immediate result
    to provide accurate feedback to the user.
    """
    if not data or 'stock' not in data:
        socketio.emit('update_request_error', {"message": "Error: 'stock' symbol is missing."})
        return

    selected_stock = data['stock'].upper()
    user_sid = request.sid
    room_name = f'stock:{selected_stock}'
    
    try:
        # This will wait for the quick lock check to complete.
        task_result = start_update_workflow_safely.apply_async(
            args=[selected_stock, f"manual_user_{user_sid}"]
        ).get(timeout=10) # 10-second timeout for safety

        join_room(room_name)
        
        if task_result == 'started':
            socketio.emit('update_request_accepted', {
                "stock": selected_stock,
                "message": f"Update process for {selected_stock} has been started."
            })
        elif task_result == 'skipped_locked':
            socketio.emit('update_request_pending', {
                "stock": selected_stock,
                "message": f"An update for {selected_stock} is already in progress. You will be notified upon completion."
            })
        else:
            # Handle unexpected results
            socketio.emit('update_request_error', {"message": "Unknown error during task initiation."})

    except Exception as e:
        print(f"ERROR: Failed to get result from starter task: {e}", flush=True)
        socketio.emit('update_request_error', {"message": f"Error starting task: {e}"})

@app.route('/schedule/<stock_symbol>', methods=['GET', 'POST', 'DELETE'])
def manage_schedule(stock_symbol):
    symbol = stock_symbol.upper()
    schedule_key = f'schedule:{symbol}'

    if request.method == 'POST':
        data = request.get_json()
        interval_5min_units = data.get('interval')
        if not isinstance(interval_5min_units, int) or interval_5min_units <= 0:
            return jsonify({"message": "Invalid interval provided. Must be a positive integer."}), 400
        
        interval_minutes = interval_5min_units * 5
        
        # Store as a hash in Redis
        redis_client.hset(schedule_key, mapping={
            'is_active': 'true',
            'interval_minutes': str(interval_minutes),
            # Do not set last_run_iso here, let the scheduler do it on first run
        })
        return jsonify({"message": f"Schedule for {symbol} started. Will run every {interval_minutes} minutes."}), 200

    if request.method == 'DELETE':
        redis_client.delete(schedule_key)
        return jsonify({"message": f"Schedule for {symbol} stopped."}), 200

    if request.method == 'GET':
        if not redis_client.exists(schedule_key):
            return jsonify({"is_active": False, "interval": 0}), 200
        
        details = redis_client.hgetall(schedule_key)
        interval_minutes = int(details.get('interval_minutes', 0))
        interval_5min_units = interval_minutes / 5

        return jsonify({
            "is_active": details.get('is_active') == 'true',
            "interval": interval_5min_units,
        }), 200

# =================================================================
# 4. DEFINE SOCKET.IO EVENT HANDLERS
# =================================================================
@socketio.on('connect')
def handle_connect():
    print('Client connected to Python Socket.IO server')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')