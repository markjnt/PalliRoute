# syntax=docker/dockerfile:1.6

# Build stage for scheduler
FROM python:3.12-slim AS scheduler

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /scheduler

# Install only scheduler dependencies
RUN pip install requests apscheduler

# Copy only scheduler-related files
COPY backend/run_scheduler.py .
COPY backend/config.py .
COPY backend/app/ ./app/

# Main stage for API
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

# Set environment variables
ENV FLASK_APP=run.py \
    FLASK_ENV=production

# Expose the port
EXPOSE 9000

# Default command (can be overridden in docker-compose)
CMD ["gunicorn", "--bind=0.0.0.0:9000", "run:app", "--workers=8", "--timeout=300"]

# Create scheduler image
FROM scheduler AS scheduler-image
CMD ["python", "run_scheduler.py"] 
