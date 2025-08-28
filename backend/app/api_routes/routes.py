from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta, date
import os
from ..models.employee import Employee
from ..models.appointment import Appointment
from ..models.route import Route
from ..services.route_planner import RoutePlanner
from ..services.route_optimizer import RouteOptimizer
from .. import db
from ..models.patient import Patient

routes_bp = Blueprint('routes', __name__)
route_planner = RoutePlanner()
route_optimizer = RouteOptimizer()

@routes_bp.route('/', methods=['GET'])
def get_routes():
    """
    Get all routes with optional filtering
    Query parameters:
    - employee_id: Filter by employee
    - weekday: Filter by weekday (monday, tuesday, etc.)
    - date: Filter by specific date (YYYY-MM-DD)
    """
    try:
        # Get query parameters
        employee_id = request.args.get('employee_id', type=int)
        weekday = request.args.get('weekday', '').lower()
        date_str = request.args.get('date')

        # Build query
        query = Route.query

        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        
        if weekday:
            query = query.filter_by(weekday=weekday)
        
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d')
                weekday = date.strftime('%A').lower()
                query = query.filter_by(weekday=weekday)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        routes = query.all()
        return jsonify({
            'routes': [route.to_dict() for route in routes]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<int:route_id>', methods=['PUT'])
def update_route(route_id):
    """
    Update an existing route by reordering appointments
    Expected JSON body: {
        "appointment_id": 1,  # ID of the appointment to move
        "direction": "up" or "down",  # Direction to move the appointment (optional if index is provided)
        "index": 2  # Target index to move appointment to (optional if direction is provided)
    }
    """
    try:
        route = Route.query.get_or_404(route_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'appointment_id' not in data:
            return jsonify({'error': 'appointment_id is required'}), 400

        appointment_id = data['appointment_id']
        direction = data.get('direction', '').lower()
        target_index = data.get('index')

        # Validate input parameters
        if not direction and target_index is None:
            return jsonify({'error': 'Either direction or index must be provided'}), 400
        
        if direction and target_index is not None:
            return jsonify({'error': 'Cannot provide both direction and index'}), 400

        if direction and direction not in ['up', 'down']:
            return jsonify({'error': 'direction must be "up" or "down"'}), 400

        if target_index is not None and (not isinstance(target_index, int) or target_index < 0):
            return jsonify({'error': 'index must be a non-negative integer'}), 400

        # Get current route order
        route_order = route.get_route_order()
        
        if not route_order:
            return jsonify({'error': 'Route is empty'}), 400

        # Find the index of the appointment to move
        try:
            current_index = route_order.index(appointment_id)
        except ValueError:
            return jsonify({'error': 'Appointment not found in route'}), 404

        # Calculate new index
        if direction:
            # Use direction-based movement
            if direction == 'up' and current_index > 0:
                new_index = current_index - 1
            elif direction == 'down' and current_index < len(route_order) - 1:
                new_index = current_index + 1
            else:
                return jsonify({'error': f'Cannot move appointment {direction}'}), 400
        else:
            # Use target index
            if target_index >= len(route_order):
                return jsonify({'error': f'Index {target_index} is out of range. Route has {len(route_order)} appointments'}), 400
            
            new_index = target_index

        # Move appointment to new position
        if current_index != new_index:
            # Remove appointment from current position
            appointment = route_order.pop(current_index)
            # Insert appointment at new position
            route_order.insert(new_index, appointment)

        # Update route order
        route.set_route_order(route_order)

        # Recalculate route using RoutePlanner
        route_planner.plan_route(route.weekday, route.employee_id)

        return jsonify({
            'message': 'Route updated successfully',
            'route': route.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<int:route_id>', methods=['GET'])
def get_route(route_id):
    """Get details of a specific route"""
    try:
        route = Route.query.get_or_404(route_id)
        return jsonify({
            'route': route.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/optimize', methods=['POST'])
def optimize_routes():
    """
    Optimize routes for a specific weekday and employee.
    Expected JSON body: {
        "weekday": "monday",  # Wochentag (kleingeschrieben)
        "employee_id": 1      # Mitarbeiter-ID
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        weekday = data.get('weekday', '').lower()
        employee_id = data.get('employee_id')
        if not weekday or not employee_id:
            return jsonify({'error': 'weekday and employee_id are required'}), 400
        # Führe die Optimierung durch
        route_optimizer.optimize_route(weekday, employee_id)
        return jsonify({'message': 'Routes optimized successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500 