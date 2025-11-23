from flask import Blueprint, request, jsonify
from datetime import datetime, date
from app import db
from app.models.oncall_assignment import OnCallAssignment, DutyType
from app.models.employee import Employee
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
        
        # Validate area if provided
        area = data.get('area')
        if area and employee.area:
            # Check if employee area matches (allowing for "Nord- und Südkreis" employees)
            if employee.area != 'Nord- und Südkreis':
                if area == 'Nord' and 'Nord' not in employee.area:
                    return jsonify({'error': 'Employee area does not match assignment area'}), 400
                if area == 'Süd' and 'Süd' not in employee.area:
                    return jsonify({'error': 'Employee area does not match assignment area'}), 400
        
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
        
        return jsonify(assignment.to_dict()), 201
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
        db.session.delete(assignment)
        db.session.commit()
        
        return jsonify({'message': 'Assignment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oncall_assignments_bp.route('/capacity/<int:employee_id>', methods=['GET'])
def get_employee_capacity(employee_id):
    """Get capacity information for an employee (monthly limits vs current assignments)"""
    try:
        employee = Employee.query.get_or_404(employee_id)
        
        # Get month and year from query params, default to current month
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        if not month or not year:
            today = date.today()
            month = month if month else today.month
            year = year if year else today.year
        
        # Get first and last day of month
        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])
        
        # Get all assignments for this employee in the month
        assignments = OnCallAssignment.query.filter(
            OnCallAssignment.employee_id == employee_id,
            OnCallAssignment.date >= first_day,
            OnCallAssignment.date <= last_day
        ).all()
        
        # Count assignments by duty type
        assignment_counts = {}
        for assignment in assignments:
            duty_type = assignment.duty_type
            assignment_counts[duty_type] = assignment_counts.get(duty_type, 0) + 1
        
        # Get capacity limits from employee model
        capacity_info = {
            'employee_id': employee_id,
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'month': month,
            'year': year,
            'capacities': {
                'rb_nursing_weekday': {
                    'limit': employee.oncall_nursing_weekday or 0,
                    'assigned': assignment_counts.get('rb_nursing_weekday', 0),
                    'remaining': (employee.oncall_nursing_weekday or 0) - assignment_counts.get('rb_nursing_weekday', 0)
                },
                'rb_nursing_weekend_day': {
                    'limit': employee.oncall_nursing_weekend_day or 0,
                    'assigned': assignment_counts.get('rb_nursing_weekend_day', 0),
                    'remaining': (employee.oncall_nursing_weekend_day or 0) - assignment_counts.get('rb_nursing_weekend_day', 0)
                },
                'rb_nursing_weekend_night': {
                    'limit': employee.oncall_nursing_weekend_night or 0,
                    'assigned': assignment_counts.get('rb_nursing_weekend_night', 0),
                    'remaining': (employee.oncall_nursing_weekend_night or 0) - assignment_counts.get('rb_nursing_weekend_night', 0)
                },
                'rb_doctors_weekday': {
                    'limit': employee.oncall_doctors_weekday or 0,
                    'assigned': assignment_counts.get('rb_doctors_weekday', 0),
                    'remaining': (employee.oncall_doctors_weekday or 0) - assignment_counts.get('rb_doctors_weekday', 0)
                },
                'rb_doctors_weekend': {
                    'limit': employee.oncall_doctors_weekend or 0,
                    'assigned': assignment_counts.get('rb_doctors_weekend', 0),
                    'remaining': (employee.oncall_doctors_weekend or 0) - assignment_counts.get('rb_doctors_weekend', 0)
                },
                'aw_nursing': {
                    'limit': employee.weekend_services_nursing or 0,
                    'assigned': assignment_counts.get('aw_nursing', 0),
                    'remaining': (employee.weekend_services_nursing or 0) - assignment_counts.get('aw_nursing', 0)
                }
            }
        }
        
        return jsonify(capacity_info), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

