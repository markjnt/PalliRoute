from app import create_app, db, scheduler_service

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Start the scheduler for automatic imports if enabled
        if app.config.get('AUTO_IMPORT_ENABLED', True):
            scheduler_service.start()
    app.run(debug=True, port=9000, host='0.0.0.0') 