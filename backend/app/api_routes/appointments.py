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
        "target_area": "Südkreis"   # For weekend appointments
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
            source_route = Route.query.filter_by(
                employee_id=None,
                weekday=weekday,
                area=source_area
            ).first()
            
            # Get target route for this weekday and area
            target_route = Route.query.filter_by(
                employee_id=None,
                weekday=weekday,
                area=target_area
            ).first()
            
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
                route_planner.plan_route(weekday, source_employee_id, calendar_week=appointment.calendar_week)
            
            if target_route and appointment.visit_type in ('HB', 'NA'):
                # Only add HB and NA appointments to route order (exclude TK)
                route_order = target_route.get_route_order()
                route_order.append(appointment.id)
                target_route.set_route_order(route_order)
                
                # Optimize target route
                route_optimizer.optimize_route(weekday, target_employee_id, calendar_week=appointment.calendar_week)
        
        db.session.commit()
        return jsonify({'message': 'Appointment moved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointments_bp.route('/batchmove', methods=['POST'])
def batch_move_appointments():
    """
    Move all appointments from source employee to target employee or between areas for a specific weekday
    Expected JSON body: {
        "source_employee_id": 1,  # For weekday appointments
        "target_employee_id": 2,  # For weekday appointments
        "source_area": "Nordkreis",  # For weekend appointments
        "target_area": "Südkreis",   # For weekend appointments
        "weekday": "monday"
    }
    """
    try:
        data = request.get_json()
        if not data or 'weekday' not in data:
            return jsonify({'error': 'weekday is required'}), 400

        source_employee_id = data.get('source_employee_id')
        target_employee_id = data.get('target_employee_id')
        source_area = data.get('source_area')
        target_area = data.get('target_area')
        weekday = data['weekday']
        
        # Determine if this is a weekday or weekend operation
        is_weekend = weekday in ['saturday', 'sunday']
        
        if is_weekend:
            # Weekend operation - move between areas
            if not source_area or not target_area:
                return jsonify({'error': 'source_area and target_area are required for weekend operations'}), 400
            
            # Get all appointments for source area for this specific weekday
            appointments = Appointment.query.filter_by(area=source_area, weekday=weekday, employee_id=None).all()
            
            # Get source route for this weekday and area
            source_route = Route.query.filter_by(
                employee_id=None,
                weekday=weekday,
                area=source_area
            ).first()
            
            # Get target route for this weekday and area
            target_route = Route.query.filter_by(
                employee_id=None,
                weekday=weekday,
                area=target_area
            ).first()
            
            if source_route:
                # Clear source route order
                source_route.set_route_order([])
                # Recalculate source route (now empty)
                if appointments:
                    route_planner.plan_route(weekday, area=source_area, calendar_week=appointments[0].calendar_week)
            
            if target_route:
                # Get all HB and NA appointments for this weekday
                weekday_appointments = [app for app in appointments if app.visit_type in ('HB', 'NA')]
                appointment_ids = [app.id for app in weekday_appointments]
                
                # Add appointments to target route order
                route_order = target_route.get_route_order()
                route_order.extend(appointment_ids)
                target_route.set_route_order(route_order)
                
                # Optimize weekend route
                if appointments:
                    route_optimizer.optimize_route(weekday, area=target_area, calendar_week=appointments[0].calendar_week)
            
            # Update all appointments to new area
            for appointment in appointments:
                appointment.area = target_area
        else:
            # Weekday operation - move between employees
            if not source_employee_id or not target_employee_id:
                return jsonify({'error': 'source_employee_id and target_employee_id are required for weekday operations'}), 400
            
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
                if appointments:
                    route_planner.plan_route(weekday, source_employee_id, calendar_week=appointments[0].calendar_week)
            
            if target_route:
                # Get all HB and NA appointments for this weekday
                weekday_appointments = [app for app in appointments if app.visit_type in ('HB', 'NA')]
                appointment_ids = [app.id for app in weekday_appointments]
                
                # Add appointments to target route order
                route_order = target_route.get_route_order()
                route_order.extend(appointment_ids)
                target_route.set_route_order(route_order)
                
                # Optimize target route
                if appointments:
                    route_optimizer.optimize_route(weekday, target_employee_id, calendar_week=appointments[0].calendar_week)
            
            # Update all appointments to new employee
            for appointment in appointments:
                appointment.employee_id = target_employee_id
        
        db.session.commit()
        return jsonify({'message': 'Appointments moved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500