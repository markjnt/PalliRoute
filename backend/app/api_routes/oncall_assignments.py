from flask import Blueprint, request, jsonify
from datetime import datetime, date
from app import db
from app.models.oncall_assignment import OnCallAssignment, DutyType
from app.models.employee import Employee
from app.models.route import Route
from calendar import monthrange

oncall_assignments_bp = Blueprint('oncall_assignments', __name__)

def get_calendar_week(dt):
    """Get ISO calendar week number from date"""
    return dt.isocalendar()[1]

@oncall_assignments_bp.route('/', methods=['GET'])
def get_oncall_assignments():
    """Get all on-call assignments with optional filtering"""
    try:
        query = OnCallAssignment.query
        
        # Filter by date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(OnCallAssignment.date >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(OnCallAssignment.date <= end_date)
        
        # Filter by calendar week
        calendar_week = request.args.get('calendar_week', type=int)
        if calendar_week:
            query = query.filter(OnCallAssignment.calendar_week == calendar_week)
        
        # Filter by duty type
        duty_type = request.args.get('duty_type')
        if duty_type:
            query = query.filter(OnCallAssignment.duty_type == duty_type)
        
        # Filter by area
        area = request.args.get('area')
        if area:
            query = query.filter(OnCallAssignment.area == area)
        
        # Filter by employee
        employee_id = request.args.get('employee_id', type=int)
        if employee_id:
            query = query.filter(OnCallAssignment.employee_id == employee_id)
        
        assignments = query.order_by(OnCallAssignment.date).all()
        
        return jsonify([assignment.to_dict() for assignment in assignments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@oncall_assignments_bp.route('/', methods=['POST'])
def create_oncall_assignment():
    """Create a new on-call assignment"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['employee_id', 'date', 'duty_type']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Parse date
        assignment_date = data['date']
        if isinstance(assignment_date, str):
            assignment_date = datetime.strptime(assignment_date, '%Y-%m-%d').date()
        
        # Validate duty_type
        valid_duty_types = [dt.value for dt in DutyType]
        if data['duty_type'] not in valid_duty_types:
            return jsonify({'error': f'Invalid duty_type. Must be one of: {", ".join(valid_duty_types)}'}), 400
        
        # Check if employee exists
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        # Validate employee function matches duty type
        duty_type = data['duty_type']
        if 'doctors' in duty_type and employee.function not in ['Arzt', 'Honorararzt']:
            return jsonify({'error': 'Employee must be a doctor for this duty type'}), 400
        if 'nursing' in duty_type and employee.function in ['Arzt', 'Honorararzt']:
            return jsonify({'error': 'Employee must be nursing staff for this duty type'}), 400
        
        # Get area from data (no validation - employees can be assigned to any area)
        area = data.get('area')
        
        # Calculate calendar week
        calendar_week = get_calendar_week(assignment_date)
        
        # Check for existing assignment (same date, duty_type, area)
        existing = OnCallAssignment.query.filter_by(
            date=assignment_date,
            duty_type=duty_type,
            area=area
        ).first()
        
        if existing:
            # Update existing assignment
            existing.employee_id = data['employee_id']
            existing.calendar_week = calendar_week
            existing.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify(existing.to_dict()), 200
        
        # Create new assignment
        assignment = OnCallAssignment(
            employee_id=data['employee_id'],
            date=assignment_date,
            duty_type=duty_type,
            area=area,
            calendar_week=calendar_week
        )
        
        db.session.add(assignment)
        db.session.commit()
        
        # Update weekend routes if this is an AW assignment
        if duty_type == 'aw_nursing':
            _update_weekend_routes_for_aw_assignment(assignment)
        
        return jsonify(assignment.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oncall_assignments_bp.route('/<int:assignment_id>', methods=['PUT'])
def update_oncall_assignment(assignment_id):
    """Update an existing on-call assignment"""
    try:
        assignment = OnCallAssignment.query.get_or_404(assignment_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update employee if provided
        if 'employee_id' in data:
            employee = Employee.query.get(data['employee_id'])
            if not employee:
                return jsonify({'error': 'Employee not found'}), 404
            
            # Validate employee function matches duty type
            duty_type = assignment.duty_type
            if 'doctors' in duty_type and employee.function not in ['Arzt', 'Honorararzt']:
                return jsonify({'error': 'Employee must be a doctor for this duty type'}), 400
            if 'nursing' in duty_type and employee.function in ['Arzt', 'Honorararzt']:
                return jsonify({'error': 'Employee must be nursing staff for this duty type'}), 400
            
            assignment.employee_id = data['employee_id']
        
        # Update date if provided
        if 'date' in data:
            assignment_date = data['date']
            if isinstance(assignment_date, str):
                assignment_date = datetime.strptime(assignment_date, '%Y-%m-%d').date()
            assignment.date = assignment_date
            assignment.calendar_week = get_calendar_week(assignment_date)
        
        # Update duty_type if provided
        if 'duty_type' in data:
            valid_duty_types = [dt.value for dt in DutyType]
            if data['duty_type'] not in valid_duty_types:
                return jsonify({'error': f'Invalid duty_type. Must be one of: {", ".join(valid_duty_types)}'}), 400
            assignment.duty_type = data['duty_type']
        
        # Update area if provided
        if 'area' in data:
            assignment.area = data['area']
        
        assignment.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Update weekend routes if this is an AW assignment
        if assignment.duty_type == 'aw_nursing':
            _update_weekend_routes_for_aw_assignment(assignment)
        
        return jsonify(assignment.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oncall_assignments_bp.route('/<int:assignment_id>', methods=['DELETE'])
def delete_oncall_assignment(assignment_id):
    """Delete an on-call assignment"""
    try:
        assignment = OnCallAssignment.query.get_or_404(assignment_id)
        
        # Store assignment info before deletion for route update
        was_aw_assignment = assignment.duty_type == 'aw_nursing'
        assignment_date = assignment.date
        assignment_area = assignment.area
        assignment_calendar_week = assignment.calendar_week
        
        db.session.delete(assignment)
        db.session.commit()
        
        # Update weekend routes if this was an AW assignment (remove employee_id)
        if was_aw_assignment:
            _remove_employee_from_weekend_routes(assignment_date, assignment_area, assignment_calendar_week)
        
        return jsonify({'message': 'Assignment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _get_employee_capacity_data(employee, month, year):
    """Helper function to get capacity data for a single employee"""
    # Get first and last day of month
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    
    # Get all assignments for this employee in the month
    assignments = OnCallAssignment.query.filter(
        OnCallAssignment.employee_id == employee.id,
        OnCallAssignment.date >= first_day,
        OnCallAssignment.date <= last_day
    ).all()
    
    # Count assignments by duty type only (not by area)
    # All areas are counted together for the same duty type
    assignment_counts = {}
    for assignment in assignments:
        duty_type = assignment.duty_type
        assignment_counts[duty_type] = assignment_counts.get(duty_type, 0) + 1

    
    # Create capacities using only the values from employee model
    # Map duty types to employee model fields
    capacities = {}
    
    # RB Pflege Wochentag (Nord + Süd zusammen)
    if employee.oncall_nursing_weekday or assignment_counts.get('rb_nursing_weekday', 0) > 0:
        limit = employee.oncall_nursing_weekday or 0
        assigned = assignment_counts.get('rb_nursing_weekday', 0)
        capacities['rb_nursing_weekday'] = {
            'limit': limit,
            'assigned': assigned,
            'remaining': max(0, limit - assigned)
        }
    
    # RB Pflege Wochenende Tag (Nord + Süd zusammen)
    if employee.oncall_nursing_weekend_day or assignment_counts.get('rb_nursing_weekend_day', 0) > 0:
        limit = employee.oncall_nursing_weekend_day or 0
        assigned = assignment_counts.get('rb_nursing_weekend_day', 0)
        capacities['rb_nursing_weekend_day'] = {
            'limit': limit,
            'assigned': assigned,
            'remaining': max(0, limit - assigned)
        }
    
    # RB Pflege Wochenende Nacht (Nord + Süd zusammen)
    if employee.oncall_nursing_weekend_night or assignment_counts.get('rb_nursing_weekend_night', 0) > 0:
        limit = employee.oncall_nursing_weekend_night or 0
        assigned = assignment_counts.get('rb_nursing_weekend_night', 0)
        capacities['rb_nursing_weekend_night'] = {
            'limit': limit,
            'assigned': assigned,
            'remaining': max(0, limit - assigned)
        }
    
    # RB Ärzte Wochentag (Nord + Süd zusammen)
    if employee.oncall_doctors_weekday or assignment_counts.get('rb_doctors_weekday', 0) > 0:
        limit = employee.oncall_doctors_weekday or 0
        assigned = assignment_counts.get('rb_doctors_weekday', 0)
        capacities['rb_doctors_weekday'] = {
            'limit': limit,
            'assigned': assigned,
            'remaining': max(0, limit - assigned)
        }
    
    # RB Ärzte Wochenende (Nord + Süd zusammen)
    if employee.oncall_doctors_weekend or assignment_counts.get('rb_doctors_weekend', 0) > 0:
        limit = employee.oncall_doctors_weekend or 0
        assigned = assignment_counts.get('rb_doctors_weekend', 0)
        capacities['rb_doctors_weekend'] = {
            'limit': limit,
            'assigned': assigned,
            'remaining': max(0, limit - assigned)
        }
    
    # AW Pflege (Nord + Mitte + Süd zusammen)
    if employee.weekend_services_nursing or assignment_counts.get('aw_nursing', 0) > 0:
        limit = employee.weekend_services_nursing or 0
        assigned = assignment_counts.get('aw_nursing', 0)
        capacities['aw_nursing'] = {
            'limit': limit,
            'assigned': assigned,
            'remaining': max(0, limit - assigned)
        }
    
    return {
        'employee_id': employee.id,
        'employee_name': f"{employee.first_name} {employee.last_name}",
        'month': month,
        'year': year,
        'capacities': capacities
    }

@oncall_assignments_bp.route('/capacity', methods=['GET'])
def get_all_employees_capacity():
    """Get capacity information for all employees (monthly limits vs current assignments)"""
    try:
        # Get month and year from query params, default to current month
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        if not month or not year:
            today = date.today()
            month = month if month else today.month
            year = year if year else today.year
        
        # Get all employees
        employees = Employee.query.all()
        
        # Get capacity data for all employees
        capacities = {}
        for employee in employees:
            capacities[employee.id] = _get_employee_capacity_data(employee, month, year)
        
        return jsonify({
            'month': month,
            'year': year,
            'capacities': capacities
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _update_weekend_routes_for_aw_assignment(assignment: OnCallAssignment):
    """
    Update weekend routes with employee_id from an AW assignment.
    Matches routes by area, weekday, and calendar_week.
    """
    if assignment.duty_type != 'aw_nursing':
        return
    
    # Map route area to assignment area
    def normalize_area(route_area: str) -> str:
        """Convert route area to assignment area format"""
        if not route_area:
            return None
        route_area_lower = route_area.lower()
        if 'nord' in route_area_lower:
            return 'Nord'
        elif 'süd' in route_area_lower or 'sued' in route_area_lower:
            return 'Süd'
        elif 'mitte' in route_area_lower:
            return 'Mitte'
        return None
    
    # Map weekday string to ISO weekday number (1=Monday, 7=Sunday)
    weekday_to_iso = {
        'saturday': 6,
        'sunday': 7
    }
    
    # Get weekday from assignment date
    assignment_weekday_iso = assignment.date.isoweekday()
    assignment_weekday_str = None
    for weekday_str, iso_num in weekday_to_iso.items():
        if iso_num == assignment_weekday_iso:
            assignment_weekday_str = weekday_str
            break
    
    if not assignment_weekday_str:
        return  # Not a weekend day
    
    # Find matching weekend routes (including those that already have an employee_id)
    weekend_routes = Route.query.filter(
        Route.weekday == assignment_weekday_str,
        Route.calendar_week == assignment.calendar_week
    ).all()
    
    for route in weekend_routes:
        # Normalize route area to match assignment area
        route_assignment_area = normalize_area(route.area)
        if route_assignment_area == assignment.area:
            route.employee_id = assignment.employee_id
            route.updated_at = datetime.utcnow()
    
    db.session.commit()

def _remove_employee_from_weekend_routes(assignment_date: date, assignment_area: str, assignment_calendar_week: int):
    """
    Remove employee_id from weekend routes when an AW assignment is deleted.
    Matches routes by area, weekday, and calendar_week.
    """
    # Map weekday string to ISO weekday number (1=Monday, 7=Sunday)
    weekday_to_iso = {
        'saturday': 6,
        'sunday': 7
    }
    
    # Get weekday from assignment date
    assignment_weekday_iso = assignment_date.isoweekday()
    assignment_weekday_str = None
    for weekday_str, iso_num in weekday_to_iso.items():
        if iso_num == assignment_weekday_iso:
            assignment_weekday_str = weekday_str
            break
    
    if not assignment_weekday_str:
        return  # Not a weekend day
    
    # Map route area to assignment area
    def normalize_area(route_area: str) -> str:
        """Convert route area to assignment area format"""
        if not route_area:
            return None
        route_area_lower = route_area.lower()
        if 'nord' in route_area_lower:
            return 'Nord'
        elif 'süd' in route_area_lower or 'sued' in route_area_lower:
            return 'Süd'
        elif 'mitte' in route_area_lower:
            return 'Mitte'
        return None
    
    # Find matching weekend routes
    weekend_routes = Route.query.filter(
        Route.weekday == assignment_weekday_str,
        Route.calendar_week == assignment_calendar_week
    ).all()
    
    for route in weekend_routes:
        # Normalize route area to match assignment area
        route_assignment_area = normalize_area(route.area)
        if route_assignment_area == assignment_area:
            # Check if there's still an AW assignment for this route
            # If not, remove employee_id
            existing_assignment = OnCallAssignment.query.filter(
                OnCallAssignment.duty_type == 'aw_nursing',
                OnCallAssignment.area == assignment_area,
                OnCallAssignment.date == assignment_date,
                OnCallAssignment.calendar_week == assignment_calendar_week
            ).first()
            
            if not existing_assignment:
                route.employee_id = None
                route.updated_at = datetime.utcnow()
    
    db.session.commit()


