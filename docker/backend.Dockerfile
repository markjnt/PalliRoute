FROM python:3.12-slim

WORKDIR /backend

# Create data directory with appropriate permissions
RUN mkdir -p /backend/data && \
    chmod 777 /backend/data

# System deps (nur falls für andere Pakete nötig)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# WICHTIG: Erst pip & wheel updaten, dann googlemaps installieren
RUN pip install --no-cache-dir --upgrade pip wheel \
 && pip install --no-cache-dir googlemaps==4.10.0

# Requirements separat, damit layer caching greift
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Env vars
ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# Expose port
EXPOSE 9000

# Run app
CMD ["gunicorn", "--bind=0.0.0.0:9000", "run:app", "--workers=8", "--timeout=300"]