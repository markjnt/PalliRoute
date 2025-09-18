from app import create_app, db, scheduler_service

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Start the scheduler for automatic imports if enabled
        if app.config.get('AUTO_IMPORT_ENABLED', True):
            scheduler_service.start()
            print("INFO: Scheduler service started successfully")
        else:
            print("INFO: Auto import is disabled in configuration")
    
    print("INFO: Scheduler service is running. Press Ctrl+C to stop.")
    try:
        # Keep the process running
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nINFO: Shutting down scheduler service...")
        scheduler_service.stop()
        print("INFO: Scheduler service stopped")
