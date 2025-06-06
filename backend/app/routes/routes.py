from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta, date
import os
from ..models.employee import Employee
from ..models.appointment import Appointment
from ..models.route import Route
from ..services.route_planner import RoutePlanner
from ..services.route_export_service import ExcelExportService
from .. import db
from ..models.patient import Patient

routes_bp = Blueprint('routes', __name__)
route_planner = RoutePlanner()
excel_service = ExcelExportService()

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

@routes_bp.route('/', methods=['POST'])
def create_route():
    """
    Create a new route manually
    Expected JSON body: {
        "employee_id": 1,
        "weekday": "monday",
        "route_order": [1, 2, 3],  # appointment IDs in order
        "total_duration": 180  # in minutes
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['employee_id', 'weekday', 'route_order', 'total_duration']
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

        # Validate employee exists
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404

        # Validate weekday
        weekday = data['weekday'].lower()
        valid_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        if weekday not in valid_weekdays:
            return jsonify({'error': 'Invalid weekday'}), 400

        # Create route
        route = Route(
            employee_id=data['employee_id'],
            weekday=weekday,
            total_duration=data['total_duration']
        )
        route.set_route_order(data['route_order'])

        db.session.add(route)
        db.session.commit()

        return jsonify({
            'message': 'Route created successfully',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<int:route_id>', methods=['PUT'])
def update_route(route_id):
    """
    Update an existing route
    Expected JSON body: {
        "employee_id": 1,  # Optional
        "weekday": "monday",  # Optional
        "route_order": [1, 2, 3],  # Optional, appointment IDs in order
        "total_duration": 180  # Optional, in minutes
    }
    """
    try:
        route = Route.query.get_or_404(route_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'employee_id' in data:
            employee = Employee.query.get(data['employee_id'])
            if not employee:
                return jsonify({'error': 'Employee not found'}), 404
            route.employee_id = data['employee_id']

        if 'weekday' in data:
            weekday = data['weekday'].lower()
            valid_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            if weekday not in valid_weekdays:
                return jsonify({'error': 'Invalid weekday'}), 400
            route.weekday = weekday

        if 'route_order' in data:
            route.set_route_order(data['route_order'])
            
            # Check if route is empty
            if not data['route_order'] or len(data['route_order']) == 0:
                # Set empty values for empty route
                route.polyline = None
                route.total_distance = 0
                route.total_duration = 0
            else:
                # Recalculate route using RoutePlanner
                route_planner = RoutePlanner()
                route_planner.plan_route(route.weekday, route.employee_id, optimize=False)

        if 'total_duration' in data:
            route.total_duration = data['total_duration']

        if 'total_distance' in data:
            route.total_distance = data['total_distance']

        route.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Route updated successfully',
            'route': route.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/<int:route_id>', methods=['DELETE'])
def delete_route(route_id):
    """Delete a route"""
    try:
        route = Route.query.get_or_404(route_id)
        db.session.delete(route)
        db.session.commit()

        return jsonify({
            'message': 'Route deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/optimize', methods=['POST'])
def optimize_routes():
    try:
        data = request.get_json()
        weekday = data.get('weekday')
        employee_id = data.get('employee_id')

        if not weekday or not employee_id:
            return jsonify({'error': 'Weekday and employee_id are required'}), 400

        # Validate weekday
        valid_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        if weekday.lower() not in valid_weekdays:
            return jsonify({'error': 'Invalid weekday'}), 400

        # Validate employee_id is a number
        try:
            employee_id = int(employee_id)
        except ValueError:
            return jsonify({'error': 'employee_id must be a number'}), 400

        # Optimize routes
        route_planner.plan_route(weekday.lower(), employee_id)

        return jsonify({'message': 'Routes optimized successfully'}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/export-excel', methods=['POST'])
def export_routes_excel():
    """
    Export routes to Excel for a specific date
    Expected JSON body: {
        "date": "YYYY-MM-DD",
        "route_ids": [1, 2, 3]  # Optional, if not provided export all routes for the date
    }
    """
    try:
        data = request.get_json()
        if not data or 'date' not in data:
            return jsonify({'error': 'Date is required'}), 400

        # Parse date
        try:
            date = datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        weekday = date.strftime('%A').lower()

        # Get routes
        if 'route_ids' in data:
            routes = Route.query.filter(Route.id.in_(data['route_ids'])).all()
        else:
            routes = Route.query.filter_by(weekday=weekday).all()

        if not routes:
            return jsonify({'error': 'No routes found'}), 404

        # Prepare route data for Excel
        route_data = []
        for route in routes:
            employee = Employee.query.get(route.employee_id)
            if not employee:
                continue

            appointments = Appointment.query.filter_by(
                employee_id=employee.id,
                weekday=weekday
            ).order_by(Appointment.time).all()

            route_data.append({
                'employee': employee,
                'route': route,
                'appointments': appointments
            })

        # Generate Excel file
        excel_file = excel_service.export_routes(date, route_data)
        
        filename = f'routes_{date.strftime("%Y%m%d")}.xlsx'
        
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
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