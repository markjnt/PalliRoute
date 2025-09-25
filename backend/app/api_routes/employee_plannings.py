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
        
        # Check for appointments for this employee and weekday (only with valid visit_type)
        appointments = Appointment.query.filter(
            Appointment.employee_id == entry.employee_id,
            Appointment.weekday == entry.weekday,
            Appointment.calendar_week == calendar_week,
            Appointment.visit_type.in_(['HB', 'NA', 'TK'])
        ).all()
        
        # Only show conflicts if status is not 'available' AND there are appointments
        entry_dict['has_conflicts'] = entry.status != 'available' and len(appointments) > 0
        entry_dict['appointments_count'] = len(appointments)        
        entries_with_conflicts.append(entry_dict)
    
    return jsonify(entries_with_conflicts), 200

@employee_planning_bp.route('/<int:employee_id>/<string:weekday>', methods=['PUT'])
def update_employee_planning(employee_id, weekday):
    """Update planning status for specific employee and weekday"""
    data = request.get_json()
    
    # Validate required fields
    if 'status' not in data:
        return jsonify({"error": "Status is required"}), 400
    
    status = data['status']
    custom_text = data.get('custom_text')
    calendar_week = data.get('calendar_week', get_current_calendar_week())
    
    # Validate status
    valid_statuses = ['available', 'vacation', 'sick', 'custom']
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400
    
    # Validate custom text for custom status
    if status == 'custom' and not custom_text:
        return jsonify({"error": "Custom text is required for custom status"}), 400
    
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
        existing_entry.status = status
        existing_entry.custom_text = custom_text
        existing_entry.updated_at = datetime.utcnow()
    else:
        # Create new entry
        new_entry = EmployeePlanning(
            employee_id=employee_id,
            weekday=db_weekday,
            status=status,
            custom_text=custom_text,
            calendar_week=calendar_week
        )
        db.session.add(new_entry)
    
    try:
        db.session.commit()
        return jsonify({"success": True, "message": "Planning status updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update planning status: {str(e)}"}), 500
