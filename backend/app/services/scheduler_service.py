import os
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore

# Simple print-based logging

class SchedulerService:
    def __init__(self, app=None):
        self.app = app
        self.scheduler = None
        self.is_running = False
        self._start_attempted = False
        
    def init_app(self, app):
        """Initialize the scheduler with Flask app context"""
        self.app = app
        
        # Configure job stores and executors
        jobstores = {
            'default': MemoryJobStore()
        }
        executors = {
            'default': ThreadPoolExecutor(20)
        }
        job_defaults = {
            'coalesce': False,
            'max_instances': 1
        }
        
        self.scheduler = BackgroundScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults
        )
        
    def start(self):
        """Start the scheduler"""
        if not self.scheduler:
            print("ERROR: Scheduler not initialized. Call init_app() first.")
            return
            
        if self._start_attempted:
            print("INFO: Scheduler start already attempted, skipping")
            return
            
        if self.is_running:
            print("INFO: Scheduler is already running")
            return
            
        # Check if auto import is enabled
        auto_import_enabled = self.app.config.get('AUTO_IMPORT_ENABLED', True)
        if not auto_import_enabled:
            print("INFO: Auto import is disabled in configuration")
            self._start_attempted = True
            return
            
        # Get interval from config
        interval_minutes = self.app.config.get('AUTO_IMPORT_INTERVAL_MINUTES', 30)
        
        # Add the import job with time restriction (7 AM to 5 PM, using configured interval)
        if interval_minutes == 1:
            # Every minute
            minute_pattern = '*'
        else:
            # Every N minutes
            minute_pattern = f'*/{interval_minutes}'
            
        # Remove any existing jobs first
        try:
            self.scheduler.remove_job('auto_import_job')
        except:
            pass  # Job doesn't exist, that's fine
            
        self.scheduler.add_job(
            func=self._scheduled_import,
            trigger=CronTrigger(minute=minute_pattern, hour='7-17'),
            id='auto_import_job',
            name='Automatic Patient Import',
            replace_existing=True
        )
        
        self._start_attempted = True
        
        if not self.scheduler.running:
            self.scheduler.start()
            self.is_running = True
            print(f"INFO: Scheduler started - automatic import will run every {interval_minutes} minute(s) between 7 AM and 5 PM")
        else:
            print("INFO: Scheduler was already running")
            
            
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            print("INFO: Scheduler stopped")
            
    def _scheduled_import(self):
        """Execute the automatic import job"""
        if not self.app:
            print("ERROR: Flask app not available for scheduled import")
            return
            
        with self.app.app_context():
            try:
                                
                # Get directory path from config
                directory_path = self.app.config.get('PATIENTS_IMPORT_PATH')
                
                if not directory_path:
                    print("ERROR: PATIENTS_IMPORT_PATH not configured")
                    return
                
                # Validate directory path
                if not os.path.exists(directory_path):
                    print(f"ERROR: Directory not found: {directory_path}")
                    return
                
                if not os.path.isdir(directory_path):
                    print(f"ERROR: Path is not a directory: {directory_path}")
                    return
                
                # Find the newest Excel file in the directory
                excel_files = []
                for file in os.listdir(directory_path):
                    if file.endswith(('.xlsx', '.xls')):
                        file_path = os.path.join(directory_path, file)
                        excel_files.append((file_path, os.path.getmtime(file_path)))
                
                if not excel_files:
                    print(f"WARNING: No Excel files found in directory: {directory_path}")
                    return
                
                # Get the newest file
                newest_file = max(excel_files, key=lambda x: x[1])[0]
                
                # Check if file was modified recently (within last 10 minutes)
                file_mtime = os.path.getmtime(newest_file)
                current_time = datetime.now().timestamp()
                time_diff = current_time - file_mtime
                
                # Only import if file was modified within the last 10 minutes
                if time_diff > 600:  # 600 seconds = 10 minutes
                    print(f"INFO: File {newest_file} was not modified recently, skipping import")
                    return
                
                # Instead of direct database access, make API call to backend-api
                import requests
                import json
                
                # Get the API base URL from environment or use default
                api_base_url = os.environ.get('BACKEND_API_URL', 'http://backend-api:9000')
                
                try:
                    # Make API call to trigger import
                    response = requests.post(f"{api_base_url}/api/patients/import", timeout=600)
                    if response.status_code == 200:
                        print("INFO: Import completed successfully via API")
                        
                        # Update last import time via API
                        from datetime import timezone
                        current_time = datetime.now(timezone.utc).astimezone().isoformat()
                        
                        # Make API call to update last import time
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
                        return
                except requests.exceptions.RequestException as e:
                    print(f"ERROR: Failed to call API for import: {str(e)}")
                    return
                
            except Exception as e:
                print(f"ERROR: Error during scheduled import: {str(e)}")
                
    def get_status(self):
        """Get scheduler status"""
        if not self.scheduler:
            return {"status": "not_initialized"}
            
        jobs = self.scheduler.get_jobs()
        return {
            "status": "running" if self.is_running else "stopped",
            "jobs": [
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in jobs
            ]
        }

# Global scheduler instance
scheduler_service = SchedulerService()
