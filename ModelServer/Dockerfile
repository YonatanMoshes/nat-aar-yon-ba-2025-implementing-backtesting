# Start with an official slim Python image
FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all your application code, including the new wsgi.py
COPY . .

# Expose the port the server will run on
EXPOSE 8001

# The command is now much simpler. We just run our wsgi.py entrypoint.
# The socketio.run() command inside that file will handle starting Gunicorn correctly.
CMD ["python", "wsgi.py"]