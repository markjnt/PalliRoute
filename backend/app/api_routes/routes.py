from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta, date
import os
from ..models.employee import Employee
from ..models.appointment import Appointment
from ..models.route import Route
from ..services.route_planner import RoutePlanner
from ..services.route_optimizer import RouteOptimizer
from ..services.pdf_generator import PDFGenerator
from ..services.aplano_sync import sync_employee_planning
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
    - area: Filter by area (for weekend routes)
    - weekend_only: Filter only weekend routes (saturday, sunday)
    - calendar_week: Filter by calendar week (via patient appointments)
    """
    try:
        # Get query parameters
        employee_id = request.args.get('employee_id', type=int)
        weekday = request.args.get('weekday', '').lower()
        date_str = request.args.get('date')
        area = request.args.get('area')
        weekend_only = request.args.get('weekend_only', '').lower() == 'true'
        calendar_week = request.args.get('calendar_week', type=int)

        # Build query
        query = Route.query

        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        
        if weekday:
            query = query.filter_by(weekday=weekday)
        
        if area:
            query = query.filter_by(area=area)
        
        if weekend_only:
            query = query.filter(Route.weekday.in_(['saturday', 'sunday']))
        
        if calendar_week:
            # Direct filter by calendar_week (much simpler!)
            query = query.filter_by(calendar_week=calendar_week)
        
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
        if route.employee_id:
            route_planner.plan_route(route.weekday, route.employee_id, calendar_week=route.calendar_week)
        else:
            # For weekend routes, plan by area
            route_planner.plan_route(route.weekday, area=route.area, calendar_week=route.calendar_week)

        # Note: plan_route already commits changes to database

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
    Optimize routes for a specific weekday and employee or area.
    Expected JSON body: {
        "weekday": "monday",  # Wochentag (kleingeschrieben)
        "employee_id": 1,     # Mitarbeiter-ID (for weekday routes)
        "area": "Nordkreis",  # Area (for weekend routes)
        "calendar_week": 38   # Kalenderwoche (optional, wird automatisch ermittelt falls nicht angegeben)
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        weekday = data.get('weekday', '').lower()
        employee_id = data.get('employee_id')
        area = data.get('area')
        calendar_week = data.get('calendar_week')  # Optional calendar_week from frontend
        
        if not weekday:
            return jsonify({'error': 'weekday is required'}), 400
        
        if employee_id:
            if calendar_week:
                # Optimize specific route for this calendar week
                route_optimizer.optimize_route(weekday, employee_id, calendar_week=calendar_week)
                return jsonify({'message': f'Route optimized successfully for employee {employee_id} on {weekday} (KW {calendar_week})'})
            else:
                # Optimize all routes for this employee/weekday (all calendar weeks)
                routes = Route.query.filter_by(employee_id=employee_id, weekday=weekday).all()
                optimized_count = 0
                for route in routes:
                    try:
                        route_optimizer.optimize_route(weekday, employee_id, calendar_week=route.calendar_week)
                        optimized_count += 1
                    except Exception as e:
                        print(f"Failed to optimize route for employee {employee_id} on {weekday} (KW {route.calendar_week}): {e}")
                return jsonify({'message': f'{optimized_count} routes optimized successfully for employee {employee_id} on {weekday}'})
        elif area:
            if calendar_week:
                # Optimize specific route for this calendar week
                route_optimizer.optimize_route(weekday, area=area, calendar_week=calendar_week)
                return jsonify({'message': f'Weekend route optimized successfully for area {area} on {weekday} (KW {calendar_week})'})
            else:
                # Optimize all routes for this area/weekday (all calendar weeks)
                routes = Route.query.filter_by(employee_id=None, weekday=weekday, area=area).all()
                optimized_count = 0
                for route in routes:
                    try:
                        route_optimizer.optimize_route(weekday, area=area, calendar_week=route.calendar_week)
                        optimized_count += 1
                    except Exception as e:
                        print(f"Failed to optimize weekend route for area {area} on {weekday} (KW {route.calendar_week}): {e}")
                return jsonify({'message': f'{optimized_count} weekend routes optimized successfully for area {area} on {weekday}'})  
        else:
            return jsonify({'error': 'Either employee_id or area is required'}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@routes_bp.route('/download-pdf', methods=['GET'])
def download_route_pdf():
    """
    Download complete route PDF for a calendar week, sorted by Nord/Süd
    Only includes weekday routes (Monday-Friday), sorted by employee area (Nord/Süd)
    Query parameters:
    - calendar_week: Calendar week number (required)
    """
    try:
        # Get query parameters
        calendar_week = request.args.get('calendar_week', type=int)
        selected_weekday = (request.args.get('selected_weekday') or 'monday').lower()
        valid_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        if selected_weekday not in valid_weekdays:
            selected_weekday = 'monday'
        
        # Validate required parameter
        if not calendar_week:
            return jsonify({'error': 'calendar_week is required'}), 400
        
        # Ensure employee planning is synced for this calendar week
        if not sync_employee_planning(calendar_week):
            return jsonify({'error': f'Failed to synchronize planning data for calendar week {calendar_week}'}), 500

        # Get all employees with their weekday routes for this calendar week
        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        
        # Get all employees, ordered by function and area (Nordkreis first, then Südkreis)
        employees = Employee.query.filter(
            Employee.area.in_(['Nordkreis', 'Südkreis'])
        ).order_by(
            db.case(
                (Employee.function == 'Pflegekraft', 1),
                (Employee.function == 'PDL', 2),
                (Employee.function == 'Arzt', 3),
                (Employee.function == 'Honorararzt', 4),
                (Employee.function == 'Physiotherapie', 5),
                else_=99
            ),
            db.case(
                (Employee.area == 'Nordkreis', 1),
                (Employee.area == 'Südkreis', 2),
                else_=99
            )
        ).all()
        
        # Build employee routes data structure
        employee_routes_data = []
        
        for employee in employees:
            # Get all weekday routes for this employee in this calendar week
            routes = Route.query.filter(
                Route.employee_id == employee.id,
                Route.weekday.in_(weekdays),
                Route.calendar_week == calendar_week
            ).order_by(
                # Custom order for weekdays
                db.case(
                    (Route.weekday == 'monday', 1),
                    (Route.weekday == 'tuesday', 2),
                    (Route.weekday == 'wednesday', 3),
                    (Route.weekday == 'thursday', 4),
                    (Route.weekday == 'friday', 5),
                    else_=6
                )
            ).all()
            
            # Get all appointments for this employee in this calendar week
            from app.models.appointment import Appointment
            appointments = Appointment.query.filter(
                Appointment.employee_id == employee.id,
                Appointment.calendar_week == calendar_week
            ).all()
            
            # Only add employees who have routes OR appointments
            if routes or appointments:
                employee_routes_data.append({
                    'employee': employee,
                    'routes': routes,
                    'appointments': appointments
                })
                
        # Check if any routes or appointments exist
        if not employee_routes_data:
            return jsonify({'error': f'No routes or appointments found for calendar week {calendar_week}'}), 404
        
        # Split employees into regular and doctors groups
        regular_data = []
        doctors_data = []
        for emp_block in employee_routes_data:
            func = (emp_block['employee'].function or '').strip()
            if func in ['Arzt', 'Honorararzt']:
                doctors_data.append(emp_block)
            else:
                regular_data.append(emp_block)

        # Build weekend data (Saturday/Sunday routes only)
        weekend_days = ['saturday', 'sunday']
        weekend_employee_data = []
        # Fetch all weekend routes regardless of employee (area-based)
        weekend_routes = Route.query.filter(
            Route.weekday.in_(weekend_days),
            Route.calendar_week == calendar_week
        ).order_by(
            db.case(
                (Route.weekday == 'saturday', 1),
                (Route.weekday == 'sunday', 2),
                else_=3
            )
        ).all()
        # Group by area
        area_to_routes = {}
        for r in weekend_routes:
            key = r.area or 'Unbekannt'
            area_to_routes.setdefault(key, []).append(r)
        for area, routes_in_area in area_to_routes.items():
            weekend_employee_data.append({
                'group_id': f"area-{area}",
                'area': area,
                'area_label': f"AW {area}",
                'routes': routes_in_area,
                'appointments': []
            })

        # Generate all available PDFs and zip them
        from io import BytesIO
        import zipfile
        from flask import Response
        files_to_return = []

        if regular_data:
            pdf_buffer_regular = PDFGenerator.generate_calendar_week_pdf(
                employee_routes_data=regular_data,
                calendar_week=calendar_week,
                selected_weekday=selected_weekday
            )
            files_to_return.append((f"PalliRoute_Routenplanung_Pflege_KW{calendar_week}.pdf", pdf_buffer_regular.getvalue()))

        if doctors_data:
            pdf_buffer_doctors = PDFGenerator.generate_calendar_week_pdf(
                employee_routes_data=doctors_data,
                calendar_week=calendar_week,
                selected_weekday=selected_weekday
            )
            files_to_return.append((f"PalliRoute_Routenplanung_Aerzte_KW{calendar_week}.pdf", pdf_buffer_doctors.getvalue()))

        if weekend_employee_data:
            pdf_buffer_weekend = PDFGenerator.generate_weekend_pdf(
                employee_routes_data=weekend_employee_data,
                calendar_week=calendar_week
            )
            files_to_return.append((f"PalliRoute_Routenplanung_Wochenende_KW{calendar_week}.pdf", pdf_buffer_weekend.getvalue()))

        if not files_to_return:
            return jsonify({'error': f'No routes or appointments found for calendar week {calendar_week}'}), 404

        if len(files_to_return) == 1:
            filename, pdf_bytes = files_to_return[0]
            return Response(pdf_bytes, mimetype='application/pdf', headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            })

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for fname, fbytes in files_to_return:
                zipf.writestr(fname, fbytes)
        zip_buffer.seek(0)
        zip_filename = f"PalliRoute_Routenplanung_KW{calendar_week}.zip"
        return Response(zip_buffer.getvalue(), mimetype='application/zip', headers={
            'Content-Disposition': f'attachment; filename="{zip_filename}"'
        })
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 