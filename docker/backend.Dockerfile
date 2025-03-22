FROM python:3.12-slim

WORKDIR /backend

# Create data directory with appropriate permissions
RUN mkdir -p /backend/data && \
    chmod 777 /backend/data

# Copy requirements first for better layer caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Set environment variables
ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# Expose the port
EXPOSE 9000

# Run the application with Gunicorn
CMD ["gunicorn", "--bind=0.0.0.0:9000", "run:app", "--workers=4"] 