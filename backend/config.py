import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # Database configuration
    # Using os.path.join ensures path separators are correct for the current OS
    data_dir = os.path.join(basedir, 'data')
    # Create data directory if it doesn't exist
    os.makedirs(data_dir, exist_ok=True)
    db_path = os.path.join(data_dir, 'palliroute.db')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Google Maps configuration
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')
    
    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Import configuration
    xlsx_base_path = os.environ.get('XLSX_IMPORT_PATH_DEV') or os.path.join(basedir, 'data', 'excel_import')

    employees_dir = os.path.join(xlsx_base_path, 'Mitarbeiterliste') if xlsx_base_path else None
    if employees_dir:
        os.makedirs(employees_dir, exist_ok=True)
    employees_filename = os.environ.get('EMPLOYEES_IMPORT_FILENAME', 'Mitarbeiterliste.xlsx')
    EMPLOYEES_IMPORT_PATH = (
        os.path.join(employees_dir, employees_filename)
        if employees_dir and employees_filename
        else None
    )

    PATIENTS_IMPORT_PATH = os.path.join(xlsx_base_path, 'Export_PalliDoc') if xlsx_base_path else None
    
    # Scheduler configuration
    AUTO_IMPORT_ENABLED = os.environ.get('AUTO_IMPORT_ENABLED', 'true').lower() == 'true'
    AUTO_IMPORT_INTERVAL_MINUTES = int(os.environ.get('AUTO_IMPORT_INTERVAL_MINUTES', '30'))
    BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://backend-api:9000')

    # Aplano API configuration
    APLANO_API_KEY = os.environ.get('APLANO_API_KEY')
    APLANO_API_BASE_URL = 'https://web.aplano.de/papi/v1'
