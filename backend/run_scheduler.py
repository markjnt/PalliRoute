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
            
        # Get interval from config
        interval_minutes = config.AUTO_IMPORT_INTERVAL_MINUTES
        
        # Add the import job
        if interval_minutes == 1:
            minute_pattern = '*'
        else:
            minute_pattern = f'*/{interval_minutes}'
            
        self.scheduler.add_job(
            func=self._scheduled_import,
            trigger=CronTrigger(minute=minute_pattern, hour='8-16'),
            id='auto_import_job',
            name='Automatic Patient Import',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        print(f"INFO: Scheduler started - automatic import will run every {interval_minutes} minute(s) between 8 AM and 4:30 PM")
        
    def stop(self):
        if self.scheduler and self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            print("INFO: Scheduler stopped")
            
    def _scheduled_import(self):
        """Execute the automatic import job"""
        try:
            # Check if current time is after 16:30 (4:30 PM)
            current_time = datetime.now()
            if current_time.hour > 16 or (current_time.hour == 16 and current_time.minute > 30):
                print(f"INFO: Current time {current_time.strftime('%H:%M')} is after 16:30, skipping import")
                return
            
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
