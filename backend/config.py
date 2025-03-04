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
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'data', 'palliroute.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Google Maps configuration
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')

