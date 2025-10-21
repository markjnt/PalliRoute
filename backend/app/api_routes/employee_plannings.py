from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.employee_planning import EmployeePlanning
from app.models.appointment import Appointment
from app.models.route import Route
from app.services.aplano_sync import sync_employee_planning
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
    
    # Sync with Aplano before querying database
    sync_warning = None
    try:
        sync_employee_planning(calendar_week)
    except Exception as e:
        # If sync fails, continue with existing data but report the error
        sync_warning = f"Aplano sync failed: {str(e)}"
    
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

        # Add count of appointments that would be affected by a replacement change for this entry
        affected_appointments = Appointment.query.filter(
            Appointment.weekday == entry.weekday,
            Appointment.calendar_week == calendar_week,
            Appointment.origin_employee_id == entry.employee_id
        ).all()
        entry_dict['replacement_affected_count'] = len(affected_appointments)
        
        entries_with_conflicts.append(entry_dict)
    
    # Prepare response with optional sync warning
    response_data = entries_with_conflicts
    if sync_warning:
        response_data = {
            "data": entries_with_conflicts,
            "warning": sync_warning
        }
    
    return jsonify(response_data), 200




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
        moved_appointments = []  # Track which appointments were moved for route updates
        
        for appointment in appointments:
            # Bestimme den aktuell zuständigen Mitarbeiter basierend auf origin_employee_id
            if appointment.origin_employee_id:
                current_responsible = get_current_responsible(appointment.origin_employee_id, db_weekday, calendar_week)
                if appointment.employee_id != current_responsible:
                    # Track the move for route updates
                    moved_appointments.append({
                        'appointment': appointment,
                        'old_employee_id': appointment.employee_id,
                        'new_employee_id': current_responsible
                    })
                    appointment.employee_id = current_responsible
                    moved_count += 1

        # Update route orders and recalculate routes for affected employees
        if moved_appointments:
            from app.services.route_optimizer import RouteOptimizer
            from app.models.route import Route
            
            route_optimizer = RouteOptimizer()
            affected_employees = set()
            
            # Collect all affected employees
            for move in moved_appointments:
                affected_employees.add(move['old_employee_id'])
                affected_employees.add(move['new_employee_id'])
            
            # Update routes for each affected employee
            for emp_id in affected_employees:
                # Get route for this employee and weekday
                route = Route.query.filter_by(
                    employee_id=emp_id,
                    weekday=db_weekday,
                    calendar_week=calendar_week
                ).first()
                
                if route:
                    # Get current route order
                    route_order = route.get_route_order()
                    
                    # Remove appointments that moved away from this employee
                    for move in moved_appointments:
                        if move['old_employee_id'] == emp_id and move['appointment'].id in route_order:
                            route_order.remove(move['appointment'].id)
                    
                    # Add appointments that moved to this employee
                    for move in moved_appointments:
                        if (move['new_employee_id'] == emp_id and 
                            move['appointment'].visit_type in ('HB', 'NA') and 
                            move['appointment'].id not in route_order):
                            route_order.append(move['appointment'].id)
                    
                    # Update route order
                    route.set_route_order(route_order)
                    
                    # Optimize route (intelligent positioning + polyline recalculation)
                    try:
                        route_optimizer.optimize_route(db_weekday, emp_id, calendar_week=calendar_week)
                    except Exception as e:
                        print(f"Warning: Failed to optimize route for employee {emp_id}: {str(e)}")

        db.session.commit()
        
        message = f"Vertretung erfolgreich aktualisiert"
        if moved_count > 0:
            message += f" und {moved_count} Termin{'e' if moved_count != 1 else ''} automatisch verschoben"
        
        return jsonify({"success": True, "message": message, "moved_appointments": moved_count}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update replacement: {str(e)}"}), 500
