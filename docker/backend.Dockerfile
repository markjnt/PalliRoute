# syntax=docker/dockerfile:1.6

# Build stage for scheduler
FROM python:3.12-slim AS scheduler

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /scheduler

# Install only scheduler dependencies
RUN pip install requests apscheduler python-dotenv

# Copy only scheduler script and config
COPY backend/run_scheduler.py .
COPY backend/config.py .

# Main stage for API
FROM python:3.12-slim AS main

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /backend

# Install WeasyPrint system package (includes all dependencies)
RUN apt-get update && apt-get install -y weasyprint && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY backend/requirements.txt .

# Install dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install -U pip && \
    pip install --prefer-binary -r requirements.txt

# Copy backend code
COPY backend/ .

# Add entrypoint for migrations
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV FLASK_APP=run.py \
    FLASK_ENV=production

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]

# Create scheduler image
FROM scheduler AS scheduler-image
CMD ["python", "run_scheduler.py"] 
