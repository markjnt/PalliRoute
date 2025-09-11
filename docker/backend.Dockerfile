# syntax=docker/dockerfile:1.6
FROM python:3.12-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /backend

# Create data directory with appropriate permissions
RUN mkdir -p /backend/data && chmod 775 /backend/data

# Copy requirements first for better layer caching
COPY backend/requirements.txt .

# Install dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install -U pip && \
    pip install --prefer-binary -r requirements.txt

# Copy the backend code
COPY backend/ .

# Create migrations directory
RUN mkdir -p migrations

# Set environment variables
ENV FLASK_APP=run.py \
    FLASK_ENV=production

# Expose the port
EXPOSE 9000

# Setup database and run application
CMD ["sh", "-c", "python setup_db.py && gunicorn --bind=0.0.0.0:9000 run:app --workers=8 --timeout=300"] 
