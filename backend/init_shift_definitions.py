"""
Script to initialize ShiftDefinitions in the database.
This script is idempotent - it can be run multiple times safely.
It will only create shift definitions that don't already exist.

Usage:
    python init_shift_definitions.py
"""

from app import create_app, db
from app.models.scheduling import ShiftDefinition

# Define all shift definitions that should exist
SHIFT_DEFINITIONS = [
    # Wochentag (RB_WEEKDAY)
    {'category': 'RB_WEEKDAY', 'role': 'NURSING', 'area': 'Nord', 'time_of_day': 'NONE', 'is_weekday': True, 'is_weekend': False},
    {'category': 'RB_WEEKDAY', 'role': 'NURSING', 'area': 'Süd', 'time_of_day': 'NONE', 'is_weekday': True, 'is_weekend': False},
    {'category': 'RB_WEEKDAY', 'role': 'DOCTOR', 'area': 'Nord', 'time_of_day': 'NONE', 'is_weekday': True, 'is_weekend': False},
    {'category': 'RB_WEEKDAY', 'role': 'DOCTOR', 'area': 'Süd', 'time_of_day': 'NONE', 'is_weekday': True, 'is_weekend': False},
    
    # Wochenende RB (RB_WEEKEND)
    {'category': 'RB_WEEKEND', 'role': 'NURSING', 'area': 'Nord', 'time_of_day': 'DAY', 'is_weekday': False, 'is_weekend': True},
    {'category': 'RB_WEEKEND', 'role': 'NURSING', 'area': 'Süd', 'time_of_day': 'DAY', 'is_weekday': False, 'is_weekend': True},
    {'category': 'RB_WEEKEND', 'role': 'NURSING', 'area': 'Nord', 'time_of_day': 'NIGHT', 'is_weekday': False, 'is_weekend': True},
    {'category': 'RB_WEEKEND', 'role': 'NURSING', 'area': 'Süd', 'time_of_day': 'NIGHT', 'is_weekday': False, 'is_weekend': True},
    {'category': 'RB_WEEKEND', 'role': 'DOCTOR', 'area': 'Nord', 'time_of_day': 'NONE', 'is_weekday': False, 'is_weekend': True},
    {'category': 'RB_WEEKEND', 'role': 'DOCTOR', 'area': 'Süd', 'time_of_day': 'NONE', 'is_weekday': False, 'is_weekend': True},
    
    # Wochenenddienste (AW)
    {'category': 'AW', 'role': 'NURSING', 'area': 'Nord', 'time_of_day': 'NONE', 'is_weekday': False, 'is_weekend': True},
    {'category': 'AW', 'role': 'NURSING', 'area': 'Mitte', 'time_of_day': 'NONE', 'is_weekday': False, 'is_weekend': True},
    {'category': 'AW', 'role': 'NURSING', 'area': 'Süd', 'time_of_day': 'NONE', 'is_weekday': False, 'is_weekend': True},
]

def init_shift_definitions():
    """Initialize all shift definitions if they don't exist (idempotent)"""
    created = 0
    existing = 0
    
    for def_data in SHIFT_DEFINITIONS:
        # Check if definition already exists
        existing_def = ShiftDefinition.query.filter_by(
            category=def_data['category'],
            role=def_data['role'],
            area=def_data['area'],
            time_of_day=def_data['time_of_day']
        ).first()
        
        if existing_def:
            existing += 1
        else:
            new_def = ShiftDefinition(**def_data)
            db.session.add(new_def)
            created += 1
    
    if created > 0:
        db.session.commit()
        print(f"✓ {created} ShiftDefinitions erstellt, {existing} bereits vorhanden")
    else:
        print(f"✓ Alle ShiftDefinitions bereits vorhanden ({existing} total)")
    
    return created, existing

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        try:
            init_shift_definitions()
        except Exception as e:
            print(f"Fehler beim Initialisieren der ShiftDefinitions: {e}")
            import sys
            sys.exit(1)
