import eventlet
eventlet.monkey_patch()

from app import app, socketio

if __name__ == "__main__":
    # This tells the Socket.IO server to run the Flask app,
    # using the Gunicorn server with an eventlet worker.
    # It correctly handles both standard HTTP and WebSocket traffic.
    socketio.run(app, host='0.0.0.0', port=8001, debug=False)