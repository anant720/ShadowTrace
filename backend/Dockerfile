FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Expose the port (Render uses $PORT, but we'll default to 8000)
ENV PORT=8000
EXPOSE $PORT

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
