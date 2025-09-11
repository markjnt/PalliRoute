import os
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self, app=None):
        self.app = app
        self.scheduler = None
        self.is_running = False
        
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
        if self.scheduler and not self.is_running:
            # Check if auto import is enabled
            auto_import_enabled = self.app.config.get('AUTO_IMPORT_ENABLED', True)
            if not auto_import_enabled:
                logger.info("Auto import is disabled in configuration")
                return
                
            # Get interval from config
            interval_minutes = self.app.config.get('AUTO_IMPORT_INTERVAL_MINUTES', 10)
            
            # Add the import job
            self.scheduler.add_job(
                func=self._scheduled_import,
                trigger=IntervalTrigger(minutes=interval_minutes),
                id='auto_import_job',
                name='Automatic Patient Import',
                replace_existing=True
            )
            
            self.scheduler.start()
            self.is_running = True
            logger.info(f"Scheduler started - automatic import will run every {interval_minutes} minutes")
            
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler stopped")
            
    def _scheduled_import(self):
        """Execute the automatic import job"""
        if not self.app:
            logger.error("Flask app not available for scheduled import")
            return
            
        with self.app.app_context():
            try:
                # Import here to avoid circular import
                from app import db
                from app.models.patient import Patient
                from app.models.appointment import Appointment
                from app.models.route import Route
                from app.models.system_info import SystemInfo
                from app.services.excel_import_service import ExcelImportService
                
                logger.info("Starting scheduled import...")
                
                # Get directory path from config
                directory_path = self.app.config.get('PATIENTS_IMPORT_PATH')
                
                if not directory_path:
                    logger.error("PATIENTS_IMPORT_PATH not configured")
                    return
                
                # Validate directory path
                if not os.path.exists(directory_path):
                    logger.error(f"Directory not found: {directory_path}")
                    return
                
                if not os.path.isdir(directory_path):
                    logger.error(f"Path is not a directory: {directory_path}")
                    return
                
                # Find the newest Excel file in the directory
                excel_files = []
                for file in os.listdir(directory_path):
                    if file.endswith(('.xlsx', '.xls')):
                        file_path = os.path.join(directory_path, file)
                        excel_files.append((file_path, os.path.getmtime(file_path)))
                
                if not excel_files:
                    logger.warning(f"No Excel files found in directory: {directory_path}")
                    return
                
                # Get the newest file
                newest_file = max(excel_files, key=lambda x: x[1])[0]
                
                # Check if file was modified recently (within last 10 minutes)
                file_mtime = os.path.getmtime(newest_file)
                current_time = datetime.now().timestamp()
                time_diff = current_time - file_mtime
                
                # Only import if file was modified within the last 10 minutes
                if time_diff > 600:  # 600 seconds = 10 minutes
                    logger.info(f"File {newest_file} was not modified recently, skipping import")
                    return
                
                # Clear the database first
                logger.info("Clearing existing data...")
                appointment_count = Appointment.query.count()
                patient_count = Patient.query.count()
                route_count = Route.query.count()
                
                # Delete in correct order (due to foreign key relationships)
                Route.query.delete()
                Appointment.query.delete()
                Patient.query.delete()
                
                db.session.commit()
                logger.info(f"Deleted {route_count} routes, {appointment_count} appointments and {patient_count} patients")
                
                # Import the new data
                logger.info(f"Starting import from file: {newest_file}")
                result = ExcelImportService.import_patients(newest_file)
                patients = result['patients']
                appointments = result['appointments']
                routes = result.get('routes', [])
                
                logger.info(f"Successfully imported {len(patients)} patients, {len(appointments)} appointments and {len(routes)} routes")
                
                # Update last import time (use local timezone)
                current_time = datetime.now().isoformat()
                SystemInfo.set_value('last_patient_import_time', current_time)
                logger.info(f"Updated last import time to: {current_time}")
                
            except Exception as e:
                from app import db
                db.session.rollback()
                logger.error(f"Error during scheduled import: {str(e)}")
                
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
