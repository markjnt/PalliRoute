#!/bin/sh

echo "Running DB migrations..."
if flask db upgrade -d backend/data/migrations; then
    echo "Migrations completed successfully"
else
    echo "WARNING: Migration failed or no migrations to run. Continuing anyway..."
fi

echo "Starting Gunicorn..."
exec gunicorn --bind=0.0.0.0:9000 run:app --workers=8 --timeout=300

