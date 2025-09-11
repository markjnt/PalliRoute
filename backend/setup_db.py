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
        env_file = os.path.join(migrations_dir, 'env.py')
        
        try:
            # Prüfe ob Migrationen bereits existieren
            if not os.path.exists(migrations_dir):
                print("🔄 Initialisiere Migrationen...")
                init()
                print("✅ Migrationen initialisiert")
                
                print("🔄 Erstelle erste Migration...")
                migrate(message='Initial migration')
                print("✅ Erste Migration erstellt")
            
            # Prüfe ob env.py existiert und Migrationen funktionieren
            if os.path.exists(env_file):
                print("🔄 Wende Migrationen an...")
                upgrade()
                print("✅ Datenbank ist bereit!")
            else:
                raise Exception("env.py nicht gefunden")
                
        except Exception as e:
            print(f"⚠️ Migrationen fehlgeschlagen: {e}")
            print("🔄 Verwende create_all als Fallback...")
            db.create_all()
            print("✅ Datenbank ist bereit!")

if __name__ == '__main__':
    setup_database()
