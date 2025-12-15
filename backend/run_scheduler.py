import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
import requests
from datetime import datetime
from config import Config

# Simple scheduler without Flask
class SimpleScheduler:
    def __init__(self):
        self.scheduler = None
        self.is_running = False
        
    def init_scheduler(self):
        # Configure job stores and executors
        jobstores = {'default': MemoryJobStore()}
        executors = {'default': ThreadPoolExecutor(20)}
        job_defaults = {'coalesce': False, 'max_instances': 1}
        
        self.scheduler = BackgroundScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults
        )
        
    def start(self):
        if self.is_running:
            print("INFO: Scheduler is already running")
            return
            
        # Initialize config
        config = Config()
            
        # Check if auto import is enabled
        if not config.AUTO_IMPORT_ENABLED:
            print("INFO: Auto import is disabled in configuration")
            return

        # Get fixed times from environment / config (comma separated HH:MM, e.g. "08:00,12:30,16:00")
        times_str = os.environ.get('AUTO_IMPORT_TIMES', getattr(config, 'AUTO_IMPORT_TIMES', '') or '')
        times_str = times_str.strip()

        if not times_str:
            print("ERROR: No fixed import times configured. Set AUTO_IMPORT_TIMES in .env, e.g. '08:00,12:30,16:00'")
            return

        times = []
        for part in times_str.split(','):
            part = part.strip()
            if not part:
                continue
            try:
                hour_str, minute_str = part.split(':')
                hour = int(hour_str)
                minute = int(minute_str)
                if not (0 <= hour <= 23 and 0 <= minute <= 59):
                    raise ValueError
                times.append((hour, minute))
            except ValueError:
                print(f"WARNING: Invalid time format in AUTO_IMPORT_TIMES entry '{part}', expected HH:MM")

        if not times:
            print("ERROR: No valid fixed import times found in AUTO_IMPORT_TIMES. No jobs scheduled.")
            return

        # Add one job per configured time
        for hour, minute in times:
            job_id = f"auto_import_{hour:02d}{minute:02d}"
            self.scheduler.add_job(
                func=self._scheduled_import,
                trigger=CronTrigger(hour=hour, minute=minute),
                id=job_id,
                name=f"Automatic Patient Import at {hour:02d}:{minute:02d}",
                replace_existing=True
            )
        
        self.scheduler.start()
        self.is_running = True
        times_readable = ', '.join(f"{h:02d}:{m:02d}" for h, m in times)
        print(f"INFO: Scheduler started - automatic import will run at fixed times: {times_readable}")
        
    def stop(self):
        if self.scheduler and self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            print("INFO: Scheduler stopped")
            
    def _scheduled_import(self):
        """Execute the automatic import job"""
        try:
            # Get directory path from config
            config = Config()
            directory_path = config.PATIENTS_IMPORT_PATH or '/scheduler/data/excel_import/Export_PalliDoc'
            
            if not os.path.exists(directory_path):
                print(f"ERROR: Directory not found: {directory_path}")
                return
            
            # Find the newest Excel file
            excel_files = []
            for file in os.listdir(directory_path):
                if file.endswith(('.xlsx', '.xls')):
                    file_path = os.path.join(directory_path, file)
                    excel_files.append((file_path, os.path.getmtime(file_path)))
            
            if not excel_files:
                print(f"WARNING: No Excel files found in directory: {directory_path}")
                return
            
            newest_file = max(excel_files, key=lambda x: x[1])[0]
            
            # Check if file was modified recently (within last 10 minutes)
            file_mtime = os.path.getmtime(newest_file)
            current_time = datetime.now().timestamp()
            time_diff = current_time - file_mtime
            
            if time_diff > 600:  # 600 seconds = 10 minutes
                print(f"INFO: File {newest_file} was not modified recently, skipping import")
                return
            
            # Make API call to backend-api
            api_base_url = config.BACKEND_API_URL
            
            response = requests.post(f"{api_base_url}/api/patients/import", timeout=600)
            if response.status_code == 200:
                print("INFO: Import completed successfully via API")
                
                # Update last import time via API
                from datetime import timezone
                current_time = datetime.now(timezone.utc).astimezone().isoformat()
                
                update_response = requests.post(
                    f"{api_base_url}/api/config/last-import-time",
                    json={"last_import_time": current_time},
                    timeout=30
                )
                
                if update_response.status_code == 200:
                    print(f"INFO: Updated last import time to: {current_time}")
                else:
                    print(f"WARNING: Failed to update last import time: {update_response.status_code}")
                    
            else:
                print(f"ERROR: API import failed with status {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"ERROR: Error during scheduled import: {str(e)}")

# Initialize and start scheduler
scheduler = SimpleScheduler()

if __name__ == '__main__':
    scheduler.init_scheduler()
    
    # Start the scheduler for automatic imports if enabled
    config = Config()
    if config.AUTO_IMPORT_ENABLED:
        scheduler.start()
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
        scheduler.stop()
        print("INFO: Scheduler service stopped")
