from flask import Blueprint, jsonify, request
import json
from app import db
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.route import Route
from datetime import datetime
from app.models.employee import Employee
from app.services.route_optimizer import RouteOptimizer
from app.services.route_planner import RoutePlanner

appointments_bp = Blueprint('appointments', __name__)
route_optimizer = RouteOptimizer()
route_planner = RoutePlanner()

@appointments_bp.route('/', methods=['GET'])
def get_appointments():
    # Optional filters
    patient_id = request.args.get('patient_id', type=int)
    employee_id = request.args.get('employee_id', type=int)
    weekday = request.args.get('weekday')
    calendar_week = request.args.get('calendar_week', type=int)
    
    query = Appointment.query
    
    if patient_id:
        query = query.filter_by(patient_id=patient_id)
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if weekday:
        query = query.filter_by(weekday=weekday.lower())
    if calendar_week:
        # Direct filter by calendar_week (much simpler!)
        query = query.filter_by(calendar_week=calendar_week)
    
    appointments = query.all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointments_bp.route('/weekday/<weekday>', methods=['GET'])
def get_appointments_by_weekday(weekday):
    """Get all appointments for a specific weekday"""
    if weekday not in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        return jsonify({'error': 'Invalid weekday. Use monday, tuesday, wednesday, thursday, friday, saturday, or sunday'}), 400
    
    calendar_week = request.args.get('calendar_week', type=int)
    
    query = Appointment.query.filter_by(weekday=weekday)
    
    if calendar_week:
        # Direct filter by calendar_week (much simpler!)
        query = query.filter_by(calendar_week=calendar_week)
    
    appointments = query.all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointments_bp.route('/move', methods=['POST'])
def move_appointment():
    """
    Move a single appointment from source employee to target employee or between areas
    Expected JSON body: {
        "appointment_id": 1,
        "source_employee_id": 1,  # For weekday appointments
        "target_employee_id": 2,  # For weekday appointments
        "source_area": "Nordkreis",  # For weekend appointments
        "target_area": "Südkreis",   # For weekend appointments
        "respect_replacement": true  # Whether to respect replacement chain
    }
    """
    try:
        data = request.get_json()
        if not data or 'appointment_id' not in data:
            return jsonify({'error': 'appointment_id is required'}), 400

        appointment_id = data['appointment_id']
        source_employee_id = data.get('source_employee_id')
        target_employee_id = data.get('target_employee_id')
        source_area = data.get('source_area')
        target_area = data.get('target_area')
        respect_replacement = data.get('respect_replacement', True)

        # Get the appointment and its patient
        appointment = Appointment.query.get_or_404(appointment_id)
        patient_id = appointment.patient_id
        weekday = appointment.weekday  # Get the weekday of the specific appointment
        
        # Determine if this is a weekday or weekend appointment
        is_weekend = weekday in ['saturday', 'sunday']
        
        if is_weekend:
            # Weekend appointment - move between areas
            if not source_area or not target_area:
                return jsonify({'error': 'source_area and target_area are required for weekend appointments'}), 400
            
            # Get source route for this weekday and area
            source_route_query = Route.query.filter_by(
                employee_id=None,
                weekday=weekday,
                area=source_area
            )
            if appointment.calendar_week:
                source_route_query = source_route_query.filter_by(calendar_week=appointment.calendar_week)
            source_route = source_route_query.first()
            
            # Get target route for this weekday and area
            target_route_query = Route.query.filter_by(
                employee_id=None,
                weekday=weekday,
                area=target_area
            )
            if appointment.calendar_week:
                target_route_query = target_route_query.filter_by(calendar_week=appointment.calendar_week)
            target_route = target_route_query.first()
            
            # Update appointment's area
            appointment.area = target_area
            
            if source_route:
                # Remove appointment from source route
                route_order = source_route.get_route_order()
                if appointment.id in route_order:
                    route_order.remove(appointment.id)
                    source_route.set_route_order(route_order)
                
                # Recalculate source route
                route_planner.plan_route(weekday, area=source_area, calendar_week=appointment.calendar_week)
            
            if target_route and appointment.visit_type in ('HB', 'NA'):
                # Only add HB and NA appointments to route order (exclude TK)
                route_order = target_route.get_route_order()
                route_order.append(appointment.id)
                target_route.set_route_order(route_order)
                
                # Optimize weekend route
                route_optimizer.optimize_route(weekday, area=target_area, calendar_week=appointment.calendar_week)
        else:
            # Weekday appointment - move between employees
            if not source_employee_id or not target_employee_id:
                return jsonify({'error': 'source_employee_id and target_employee_id are required for weekday appointments'}), 400
            
            # Get source route for this weekday
            source_route_query = Route.query.filter_by(
                employee_id=source_employee_id,
                weekday=weekday
            )
            if appointment.calendar_week:
                source_route_query = source_route_query.filter_by(calendar_week=appointment.calendar_week)
            source_route = source_route_query.first()
            
            # Update appointment's employee first to determine final employee
            if respect_replacement:
                # Import the get_current_responsible function
                from .employee_plannings import get_current_responsible
                # Get the currently responsible employee (considering replacement chain)
                current_responsible = get_current_responsible(target_employee_id, weekday, appointment.calendar_week)
                appointment.employee_id = current_responsible
                final_employee_id = current_responsible  # Use the replacement employee for route operations
            else:
                # Direct assignment without considering replacement
                appointment.employee_id = target_employee_id
                final_employee_id = target_employee_id  # Use the original target employee for route operations
            
            # Always update origin_employee_id to the target employee
            appointment.origin_employee_id = target_employee_id
            
            # Get target route for the final employee (replacement or original)
            target_route_query = Route.query.filter_by(
                employee_id=final_employee_id,
                weekday=weekday
            )
            if appointment.calendar_week:
                target_route_query = target_route_query.filter_by(calendar_week=appointment.calendar_week)
            target_route = target_route_query.first()
            
            if source_route:
                # Remove appointment from source route
                route_order = source_route.get_route_order()
                if appointment.id in route_order:
                    route_order.remove(appointment.id)
                    source_route.set_route_order(route_order)
                
                # Plan source route
                route_planner.plan_route(weekday, source_employee_id, calendar_week=appointment.calendar_week)
            
            if target_route and appointment.visit_type in ('HB', 'NA'):
                # Only add HB and NA appointments to route order (exclude TK)
                route_order = target_route.get_route_order()
                route_order.append(appointment.id)
                target_route.set_route_order(route_order)
                
                # Optimize target route using the final employee ID (replacement or original)
                route_optimizer.optimize_route(weekday, final_employee_id, calendar_week=appointment.calendar_week)
        
        db.session.commit()
        return jsonify({'message': 'Appointment moved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointments_bp.route('/assign-weekend-area', methods=['POST'])
def assign_weekend_area():
    """
    Assign a weekend appointment that is currently unassigned to one of the weekend areas.
    Expected JSON body: {
        "appointment_id": 123,
        "target_area": "Nord"  # One of: Nord, Mitte, Süd
    }
    """
    try:
        data = request.get_json()
        if not data or 'appointment_id' not in data or 'target_area' not in data:
            return jsonify({'error': 'appointment_id and target_area are required'}), 400

        appointment_id = data['appointment_id']
        target_area = data['target_area']

        valid_areas = ['Nord', 'Mitte', 'Süd']
        if target_area not in valid_areas:
            return jsonify({'error': f"target_area must be one of {', '.join(valid_areas)}"}), 400

        appointment = Appointment.query.get_or_404(appointment_id)

        if appointment.weekday not in ['saturday', 'sunday']:
            return jsonify({'error': 'Only weekend appointments can be reassigned with this endpoint'}), 400

        original_area = appointment.area
        if original_area == target_area:
            return jsonify({'message': 'Appointment already assigned to the requested area'}), 200

        if original_area != 'Nicht zugewiesen':
            return jsonify({'error': 'Appointment is not marked as unassigned'}), 400

        # Update appointment area
        appointment.area = target_area

        # Ensure target route exists (only relevant for HB/NA)
        target_route = None
        if appointment.visit_type in ('HB', 'NA'):
            target_route_query = Route.query.filter_by(
                employee_id=None,
                weekday=appointment.weekday,
                area=target_area
            )
            if appointment.calendar_week:
                target_route_query = target_route_query.filter_by(calendar_week=appointment.calendar_week)
            target_route = target_route_query.first()

            if not target_route:
                target_route = Route(
                    employee_id=None,
                    weekday=appointment.weekday,
                    route_order=json.dumps([]),
                    total_duration=0,
                    total_distance=0,
                    area=target_area,
                    calendar_week=appointment.calendar_week
                )
                db.session.add(target_route)
                db.session.flush()

            route_order = target_route.get_route_order()
            if appointment.id not in route_order:
                route_order.append(appointment.id)
                target_route.set_route_order(route_order)
            route_optimizer.optimize_route(
                appointment.weekday,
                area=target_area,
                calendar_week=appointment.calendar_week
            )

        db.session.commit()

        return jsonify({
            'message': 'Appointment assigned successfully',
            'appointment': appointment.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointments_bp.route('/check-replacement', methods=['POST'])
def check_replacement():
    """
    Check if target employee has a replacement for the given weekday
    Expected JSON body: {
        "target_employee_id": 2,
        "weekday": "monday",
        "calendar_week": 42  # Optional
    }
    """
    try:
        data = request.get_json()
        if not data or 'target_employee_id' not in data or 'weekday' not in data:
            return jsonify({'error': 'target_employee_id and weekday are required'}), 400

        target_employee_id = data['target_employee_id']
        weekday = data['weekday']
        calendar_week = data.get('calendar_week')

        # Import the get_current_responsible function
        from .employee_plannings import get_current_responsible
        
        # Get the currently responsible employee (considering replacement chain)
        current_responsible = get_current_responsible(target_employee_id, weekday, calendar_week)
        
        # Check if there's a replacement
        has_replacement = current_responsible != target_employee_id
        
        result = {
            'has_replacement': has_replacement,
            'target_employee_id': target_employee_id,
            'current_responsible_id': current_responsible
        }
        
        if has_replacement:
            # Get the replacement employee details
            from app.models.employee import Employee
            replacement_employee = Employee.query.get(current_responsible)
            if replacement_employee:
                result['replacement_employee'] = replacement_employee.to_dict()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
