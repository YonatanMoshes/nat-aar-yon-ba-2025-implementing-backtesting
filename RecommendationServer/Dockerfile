# recommendation-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the service's code
COPY . .

EXPOSE 8002

# Use Gunicorn to run the simple Flask app. It's robust.
CMD ["python", "wsgi.py"]
