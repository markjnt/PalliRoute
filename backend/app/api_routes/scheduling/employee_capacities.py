from flask import request, jsonify
from app import db
from app.models.scheduling import EmployeeCapacity, Assignment, ShiftInstance, ShiftDefinition
from app.models.employee import Employee
from datetime import datetime
from . import scheduling_bp


def count_assignments_for_capacity(employee_id, capacity_type, month):
    """
    Count assignments for a specific employee capacity type in a given month.
    
    Maps capacity_type to ShiftDefinition filters:
    - RB_NURSING_WEEKDAY -> RB_WEEKDAY + NURSING
    - RB_NURSING_WEEKEND -> RB_WEEKEND + NURSING (both DAY and NIGHT)
    - RB_DOCTORS_WEEKDAY -> RB_WEEKDAY + DOCTOR
    - RB_DOCTORS_WEEKEND -> RB_WEEKEND + DOCTOR
    - AW_NURSING -> AW + NURSING
    
    Args:
        employee_id: Employee ID
        capacity_type: Capacity type (RB_NURSING_WEEKDAY, etc.)
        month: Month string in format "YYYY-MM" for counting assignments
    """
    # Parse month to get start and end dates
    try:
        year, month_num = map(int, month.split('-'))
        from calendar import monthrange
        _, last_day = monthrange(year, month_num)
        start_date = datetime(year, month_num, 1).date()
        end_date = datetime(year, month_num, last_day).date()
    except (ValueError, IndexError):
        return 0
    
    # Map capacity_type to ShiftDefinition filters
    if capacity_type == 'RB_NURSING_WEEKDAY':
        category = 'RB_WEEKDAY'
        role = 'NURSING'
        time_of_day = None  # Any
    elif capacity_type == 'RB_NURSING_WEEKEND':
        # Count both DAY and NIGHT assignments
        category = 'RB_WEEKEND'
        role = 'NURSING'
        time_of_day = None  # Count both DAY and NIGHT
    elif capacity_type == 'RB_DOCTORS_WEEKDAY':
        category = 'RB_WEEKDAY'
        role = 'DOCTOR'
        time_of_day = None
    elif capacity_type == 'RB_DOCTORS_WEEKEND':
        category = 'RB_WEEKEND'
        role = 'DOCTOR'
        time_of_day = None
    elif capacity_type == 'AW_NURSING':
        category = 'AW'
        role = 'NURSING'
        time_of_day = None
    else:
        return 0
    
    # Count assignments
    query = db.session.query(Assignment).join(ShiftInstance).join(ShiftDefinition).filter(
        Assignment.employee_id == employee_id,
        ShiftInstance.date >= start_date,
        ShiftInstance.date <= end_date,
        ShiftInstance.month == month,
        ShiftDefinition.category == category,
        ShiftDefinition.role == role
    )
    
    # For RB_NURSING_WEEKEND, we count both DAY and NIGHT, so no time_of_day filter
    # For others, time_of_day should be NONE (or not specified)
    if capacity_type != 'RB_NURSING_WEEKEND' and time_of_day is None:
        # For non-weekend nursing, we want time_of_day = 'NONE'
        query = query.filter(ShiftDefinition.time_of_day == 'NONE')
    
    return query.count()


@scheduling_bp.route('/employee-capacities', methods=['GET'])
def get_employee_capacities():
    """Get employee capacities with optional filtering, including assigned and remaining counts"""
    try:
        query = EmployeeCapacity.query
        
        # Filter by employee_id
        employee_id = request.args.get('employee_id', type=int)
        if employee_id:
            query = query.filter(EmployeeCapacity.employee_id == employee_id)
        
        # Filter by capacity_type
        capacity_type = request.args.get('capacity_type')
        if capacity_type:
            query = query.filter(EmployeeCapacity.capacity_type == capacity_type)
        
        # Get month parameter for calculating assigned/remaining (optional, defaults to current month)
        month = request.args.get('month')
        if not month:
            # Default to current month
            from datetime import date
            today = date.today()
            month = today.strftime('%Y-%m')
        
        capacities = query.all()
        
        # Calculate assigned and remaining for each capacity
        result = []
        for cap in capacities:
            assigned = count_assignments_for_capacity(cap.employee_id, cap.capacity_type, month)
            remaining = cap.max_count - assigned
            
            result.append({
                'id': cap.id,
                'employee_id': cap.employee_id,
                'capacity_type': cap.capacity_type,
                'max_count': cap.max_count,
                'assigned': assigned,
                'remaining': remaining,
                'employee': {
                    'id': cap.employee.id,
                    'first_name': cap.employee.first_name,
                    'last_name': cap.employee.last_name,
                    'function': cap.employee.function
                } if cap.employee else None
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
