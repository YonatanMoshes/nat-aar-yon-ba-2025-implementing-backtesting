# In recommendation-service/wsgi.py

import eventlet
# Monkey patching is crucial for Gunicorn with Socket.IO
eventlet.monkey_patch()

from app import app, socketio

# This is a standard pattern for running Flask-SocketIO with Gunicorn
if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=8002, debug=False)