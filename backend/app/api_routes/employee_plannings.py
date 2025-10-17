from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.employee_planning import EmployeePlanning
from app.models.appointment import Appointment
from app.models.route import Route
from datetime import datetime
import calendar

employee_planning_bp = Blueprint('employee_planning', __name__)

def get_current_calendar_week():
    """Get current calendar week number"""
    return datetime.now().isocalendar()[1]

def get_weekday_mapping():
    """Map German weekday names to English database format"""
    return {
        'Montag': 'monday',
        'Dienstag': 'tuesday', 
        'Mittwoch': 'wednesday',
        'Donnerstag': 'thursday',
        'Freitag': 'friday',
        'Samstag': 'saturday',
        'Sonntag': 'sunday'
    }

@employee_planning_bp.route('/', methods=['GET'])
def get_employee_planning():
    """Get all employee planning entries for current week"""
    calendar_week = request.args.get('calendar_week', get_current_calendar_week(), type=int)
    
    planning_entries = EmployeePlanning.query.filter_by(calendar_week=calendar_week).all()
    
    # Check for conflicts for each planning entry
    entries_with_conflicts = []
    for entry in planning_entries:
        entry_dict = entry.to_dict()
        
        # Add replacement employee info if exists
        if entry.replacement:
            entry_dict['replacement_employee'] = {
                'id': entry.replacement.id,
                'first_name': entry.replacement.first_name,
                'last_name': entry.replacement.last_name,
                'function': entry.replacement.function
            }
        else:
            entry_dict['replacement_employee'] = None
        
        # Check for appointments for this employee and weekday (including appointments without visit_type)
        appointments = Appointment.query.filter(
            Appointment.employee_id == entry.employee_id,
            Appointment.weekday == entry.weekday,
            Appointment.calendar_week == calendar_week
        ).filter(
            (Appointment.visit_type.in_(['HB', 'NA', 'TK'])) | 
            (Appointment.visit_type.is_(None)) | 
            (Appointment.visit_type == '')
        ).all()
        
        # Count unique patients (not appointments)
        unique_patients = set(app.patient_id for app in appointments)
        patient_count = len(unique_patients)
        
        # Only show conflicts if not available AND there are appointments
        entry_dict['has_conflicts'] = (not getattr(entry, 'available', True)) and len(appointments) > 0
        entry_dict['appointments_count'] = len(appointments)
        entry_dict['patient_count'] = patient_count
        
        entries_with_conflicts.append(entry_dict)
    
    return jsonify(entries_with_conflicts), 200



@employee_planning_bp.route('/<int:employee_id>/<string:weekday>', methods=['PUT'])
def update_employee_planning(employee_id, weekday):
    """Update planning availability for specific employee and weekday"""
    data = request.get_json()
    
    # Validate required fields
    if 'available' not in data:
        return jsonify({"error": "Field 'available' is required and must be boolean"}), 400

    available = bool(data['available'])
    custom_text = data.get('custom_text') if not available else None
    replacement_id = data.get('replacement_id')
    calendar_week = data.get('calendar_week', get_current_calendar_week())
    
    # If not available but reason text is empty, allow empty or provide default later
    
    # Map German weekday to English
    weekday_mapping = get_weekday_mapping()
    if weekday not in weekday_mapping:
        return jsonify({"error": f"Invalid weekday. Must be one of: {list(weekday_mapping.keys())}"}), 400
    
    db_weekday = weekday_mapping[weekday]
    
    # Check if planning entry already exists
    existing_entry = EmployeePlanning.query.filter_by(
        employee_id=employee_id,
        weekday=db_weekday,
        calendar_week=calendar_week
    ).first()
    
    if existing_entry:
        # Update existing entry
        existing_entry.available = available
        existing_entry.custom_text = custom_text
        existing_entry.replacement_id = replacement_id
        existing_entry.updated_at = datetime.utcnow()
    else:
        # Create new entry
        new_entry = EmployeePlanning(
            employee_id=employee_id,
            weekday=db_weekday,
            available=available,
            custom_text=custom_text,
            replacement_id=replacement_id,
            calendar_week=calendar_week
        )
        db.session.add(new_entry)
    
    try:
        db.session.commit()
        return jsonify({"success": True, "message": "Planning status updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update planning status: {str(e)}"}), 500

def get_current_responsible(employee_id, weekday, calendar_week):
    """
    Geht die Vertretungskette durch und gibt zurück, wer aktuell zuständig ist
    """
    visited = set()
    current = employee_id
    while True:
        if current in visited:
            break  # Schutz gegen zirkuläre Vertretungen
        visited.add(current)
        
        # Suche nach EmployeePlanning Eintrag für diesen Mitarbeiter und Wochentag
        planning = EmployeePlanning.query.filter_by(
            employee_id=current,
            weekday=weekday,
            calendar_week=calendar_week
        ).first()
        
        if planning and planning.replacement_id:
            current = planning.replacement_id
        else:
            break
    return current


@employee_planning_bp.route('/<int:employee_id>/<string:weekday>/replacement/count', methods=['GET'])
def get_replacement_count(employee_id, weekday):
    """Get count of appointments that would be affected by a replacement change"""
    calendar_week = request.args.get('calendar_week', get_current_calendar_week(), type=int)
    
    # Map German weekday to English
    weekday_mapping = get_weekday_mapping()
    if weekday not in weekday_mapping:
        return jsonify({"error": f"Invalid weekday. Must be one of: {list(weekday_mapping.keys())}"}), 400
    
    db_weekday = weekday_mapping[weekday]
    
    # Count appointments that would be affected
    appointments = Appointment.query.filter(
        Appointment.weekday == db_weekday,
        Appointment.calendar_week == calendar_week,
        Appointment.origin_employee_id == employee_id
    ).all()
    
    affected_count = len(appointments)
    
    return jsonify({
        "affected_appointments": affected_count,
        "employee_id": employee_id,
        "weekday": db_weekday,
        "calendar_week": calendar_week
    }), 200


@employee_planning_bp.route('/<int:employee_id>/<string:weekday>/replacement', methods=['PUT'])
def update_replacement(employee_id, weekday):
    """Update replacement for specific employee and weekday and automatically move appointments"""
    data = request.get_json()
    
    replacement_id = data.get('replacement_id')  # kann None sein, um zu entfernen
    calendar_week = data.get('calendar_week', get_current_calendar_week())

    # Map German weekday to English
    weekday_mapping = get_weekday_mapping()
    if weekday not in weekday_mapping:
        return jsonify({"error": f"Invalid weekday. Must be one of: {list(weekday_mapping.keys())}"}), 400
    
    db_weekday = weekday_mapping[weekday]
    
    try:
        # Update oder erstellen der Vertretung
        existing_entry = EmployeePlanning.query.filter_by(
            employee_id=employee_id,
            weekday=db_weekday,
            calendar_week=calendar_week
        ).first()
        
        if not existing_entry:
            # Erstelle neuen Eintrag mit available=True
            existing_entry = EmployeePlanning(
                employee_id=employee_id,
                weekday=db_weekday,
                available=True,
                calendar_week=calendar_week
            )
            db.session.add(existing_entry)

        existing_entry.replacement_id = replacement_id
        existing_entry.updated_at = datetime.utcnow()
        db.session.flush()  # Flush um sicherzustellen, dass der Eintrag in der DB ist

        # Alle betroffenen Termine aktualisieren
        # Wir holen alle Termine, deren origin_employee_id oder employee_id betroffen sein könnten
        affected_employee_ids = {employee_id}
        if replacement_id:
            affected_employee_ids.add(replacement_id)

        appointments = Appointment.query.filter(
            Appointment.weekday == db_weekday,
            Appointment.calendar_week == calendar_week
        ).filter(
            (Appointment.employee_id.in_(affected_employee_ids)) |
            (Appointment.origin_employee_id.in_(affected_employee_ids))
        ).all()

        moved_count = 0
        for appointment in appointments:
            # Bestimme den aktuell zuständigen Mitarbeiter basierend auf origin_employee_id
            if appointment.origin_employee_id:
                current_responsible = get_current_responsible(appointment.origin_employee_id, db_weekday, calendar_week)
                if appointment.employee_id != current_responsible:
                    appointment.employee_id = current_responsible
                    moved_count += 1

        db.session.commit()
        
        message = f"Vertretung erfolgreich aktualisiert"
        if moved_count > 0:
            message += f" und {moved_count} Termin{'e' if moved_count != 1 else ''} automatisch verschoben"
        
        return jsonify({"success": True, "message": message, "moved_appointments": moved_count}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update replacement: {str(e)}"}), 500
