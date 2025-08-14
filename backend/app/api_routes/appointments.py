from flask import Blueprint, jsonify, request
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
    
    query = Appointment.query
    
    if patient_id:
        query = query.filter_by(patient_id=patient_id)
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if weekday:
        query = query.filter_by(weekday=weekday.lower())
    
    appointments = query.all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointments_bp.route('/weekday/<weekday>', methods=['GET'])
def get_appointments_by_weekday(weekday):
    """Get all appointments for a specific weekday"""
    if weekday not in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
        return jsonify({'error': 'Invalid weekday. Use monday, tuesday, wednesday, thursday, or friday'}), 400
    
    appointments = Appointment.query.filter_by(weekday=weekday).all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointments_bp.route('/move', methods=['POST'])
def move_appointment():
    """
    Move a single appointment from source employee to target employee
    Expected JSON body: {
        "appointment_id": 1,
        "source_employee_id": 1,
        "target_employee_id": 2
    }
    """
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['appointment_id', 'source_employee_id', 'target_employee_id']):
            return jsonify({'error': 'Missing required fields'}), 400

        appointment_id = data['appointment_id']
        source_employee_id = data['source_employee_id']
        target_employee_id = data['target_employee_id']

        # Get the appointment and its patient
        appointment = Appointment.query.get_or_404(appointment_id)
        patient_id = appointment.patient_id
        weekday = appointment.weekday  # Get the weekday of the specific appointment
        
        # Get all appointments for this patient for this specific weekday
        patient_appointments = Appointment.query.filter_by(patient_id=patient_id, weekday=weekday).all()
        
        # Get source route for this weekday
        source_route = Route.query.filter_by(
            employee_id=source_employee_id,
            weekday=weekday
        ).first()
        
        # Get target route for this weekday
        target_route = Route.query.filter_by(
            employee_id=target_employee_id,
            weekday=weekday
        ).first()
        
        # Update appointment's employee
        appointment.employee_id = target_employee_id
        
        if source_route:
            # Remove appointment from source route
            route_order = source_route.get_route_order()
            if appointment.id in route_order:
                route_order.remove(appointment.id)
                source_route.set_route_order(route_order)
            
            # Plan source route
            route_planner.plan_route(weekday, source_employee_id)
        
        if target_route and appointment.visit_type in ('HB', 'NA'):
            # Only add HB and NA appointments to route order (exclude TK)
            route_order = target_route.get_route_order()
            route_order.append(appointment.id)
            target_route.set_route_order(route_order)
            
            # Optimize target route
            route_optimizer.optimize_route(weekday, target_employee_id)
        
        db.session.commit()
        return jsonify({'message': 'Appointment moved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointments_bp.route('/batchmove', methods=['POST'])
def batch_move_appointments():
    """
    Move all appointments from source employee to target employee for a specific weekday
    Expected JSON body: {
        "source_employee_id": 1,
        "target_employee_id": 2,
        "weekday": "monday"
    }
    """
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['source_employee_id', 'target_employee_id', 'weekday']):
            return jsonify({'error': 'Missing required fields'}), 400

        source_employee_id = data['source_employee_id']
        target_employee_id = data['target_employee_id']
        weekday = data['weekday']

        # Get all appointments for source employee for this specific weekday
        appointments = Appointment.query.filter_by(employee_id=source_employee_id, weekday=weekday).all()
        
        # Get source route for this weekday
        source_route = Route.query.filter_by(
            employee_id=source_employee_id,
            weekday=weekday
        ).first()
        
        # Get target route for this weekday
        target_route = Route.query.filter_by(
            employee_id=target_employee_id,
            weekday=weekday
        ).first()
        
        if source_route:
            # Clear source route order
            source_route.set_route_order([])
            # Plan source route
            route_planner.plan_route(weekday, source_employee_id)
        
        if target_route:
            # Get all HB and NA appointments for this weekday
            weekday_appointments = [app for app in appointments if app.visit_type in ('HB', 'NA')]
            appointment_ids = [app.id for app in weekday_appointments]
            
            # Add appointments to target route order
            route_order = target_route.get_route_order()
            route_order.extend(appointment_ids)
            target_route.set_route_order(route_order)
            
            # Optimize target route
            route_optimizer.optimize_route(weekday, target_employee_id)
        
        # Update all appointments to new employee
        for appointment in appointments:
            appointment.employee_id = target_employee_id
        
        db.session.commit()
        return jsonify({'message': 'Appointments moved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500