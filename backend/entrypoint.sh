#!/bin/sh

echo "Running DB migrations..."
flask db upgrade -d data/migrations

echo "Starting Gunicorn..."
exec gunicorn --bind=0.0.0.0:9000 run:app --workers=8 --timeout=300

