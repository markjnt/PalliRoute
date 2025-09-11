#!/usr/bin/env python3
"""
Schlankes Datenbank-Setup für PalliRoute
Initialisiert Migrationen beim ersten Start
"""

import os
import sys
from flask_migrate import init, migrate, upgrade
from app import create_app, db

def setup_database():
    """Initialisiert Migrationen beim ersten Start"""
    app = create_app()
    
    with app.app_context():
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        
        # Prüfe ob Migrationen bereits existieren
        if not os.path.exists(migrations_dir):
            print("🔄 Initialisiere Migrationen...")
            init()
            print("✅ Migrationen initialisiert")
            
            print("🔄 Erstelle erste Migration...")
            migrate(message='Initial migration')
            print("✅ Erste Migration erstellt")
        
        print("🔄 Wende Migrationen an...")
        upgrade()
        print("✅ Datenbank ist bereit!")

if __name__ == '__main__':
    setup_database()
