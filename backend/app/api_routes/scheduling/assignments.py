import re
from io import BytesIO

import pandas as pd
from flask import request, jsonify
from datetime import datetime, date
from app import db
from app.models.scheduling import Assignment, ShiftInstance, ShiftDefinition
from app.models.employee import Employee
from app.models.system_info import SystemInfo
from . import scheduling_bp


def get_calendar_week(dt):
    """Get ISO calendar week number from date"""
    return dt.isocalendar()[1]


def get_month_string(dt):
    """Get month string in YYYY-MM format"""
    return dt.strftime('%Y-%m')


@scheduling_bp.route('/assignments', methods=['GET'])
def get_assignments():
    """Get assignments with optional filtering"""
    try:
        query = db.session.query(Assignment).join(ShiftInstance).join(ShiftDefinition)
        
        # Filter by employee_id
        employee_id = request.args.get('employee_id', type=int)
        if employee_id:
            query = query.filter(Assignment.employee_id == employee_id)
        
        # Filter by shift_instance_id
        shift_instance_id = request.args.get('shift_instance_id', type=int)
        if shift_instance_id:
            query = query.filter(Assignment.shift_instance_id == shift_instance_id)
        
        # Filter by shift_definition_id (via join)
        shift_definition_id = request.args.get('shift_definition_id', type=int)
        if shift_definition_id:
            query = query.filter(ShiftInstance.shift_definition_id == shift_definition_id)
        
        # Filter by date range (via join)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(ShiftInstance.date >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(ShiftInstance.date <= end_date)
        
        # Filter by category (via join)
        category = request.args.get('category')
        if category:
            query = query.filter(ShiftDefinition.category == category)
        
        # Filter by role (via join)
        role = request.args.get('role')
        if role:
            query = query.filter(ShiftDefinition.role == role)
        
        # Filter by area (via join)
        area = request.args.get('area')
        if area:
            query = query.filter(ShiftDefinition.area == area)
        
        # Filter by source
        source = request.args.get('source')
        if source:
            query = query.filter(Assignment.source == source)
        
        assignments = query.all()
        
        return jsonify([{
            'id': ass.id,
            'employee_id': ass.employee_id,
            'shift_instance_id': ass.shift_instance_id,
            'source': ass.source,
            'employee': {
                'id': ass.employee.id,
                'first_name': ass.employee.first_name,
                'last_name': ass.employee.last_name,
                'function': ass.employee.function,
                'area': ass.employee.area
            } if ass.employee else None,
            'shift_instance': {
                'id': ass.shift_instance.id,
                'date': ass.shift_instance.date.isoformat(),
                'calendar_week': ass.shift_instance.calendar_week,
                'month': ass.shift_instance.month
            } if ass.shift_instance else None,
            'shift_definition': {
                'id': ass.shift_instance.shift_definition.id,
                'category': ass.shift_instance.shift_definition.category,
                'role': ass.shift_instance.shift_definition.role,
                'area': ass.shift_instance.shift_definition.area,
                'time_of_day': ass.shift_instance.shift_definition.time_of_day,
                'is_weekday': ass.shift_instance.shift_definition.is_weekday,
                'is_weekend': ass.shift_instance.shift_definition.is_weekend
            } if ass.shift_instance and ass.shift_instance.shift_definition else None
        } for ass in assignments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/assignments', methods=['POST'])
def create_assignment():
    """Create a new assignment"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Option 1: Provide shift_instance_id directly
        if 'shift_instance_id' in data and 'employee_id' in data:
            shift_instance_id = data['shift_instance_id']
            employee_id = data['employee_id']
            source = data.get('source', 'MANUAL')
            
            # Validate employee exists
            employee = Employee.query.get(employee_id)
            if not employee:
                return jsonify({'error': 'Employee not found'}), 404
            
            # Validate shift instance exists
            shift_instance = ShiftInstance.query.get(shift_instance_id)
            if not shift_instance:
                return jsonify({'error': 'Shift instance not found'}), 404
            
            # Check if assignment already exists
            existing = Assignment.query.filter_by(
                employee_id=employee_id,
                shift_instance_id=shift_instance_id
            ).first()
            
            if existing:
                return jsonify({
                    'error': 'Assignment already exists for this employee and shift instance',
                    'id': existing.id
                }), 409
            
            assignment = Assignment(
                employee_id=employee_id,
                shift_instance_id=shift_instance_id,
                source=source
            )
            
            db.session.add(assignment)
            db.session.commit()
            
            return jsonify({
                'id': assignment.id,
                'employee_id': assignment.employee_id,
                'shift_instance_id': assignment.shift_instance_id,
                'source': assignment.source
            }), 201
        
        # Option 2: Provide shift_definition_id + date + employee_id
        elif all(key in data for key in ['shift_definition_id', 'date', 'employee_id']):
            shift_definition_id = data['shift_definition_id']
            instance_date = data['date']
            if isinstance(instance_date, str):
                instance_date = datetime.strptime(instance_date, '%Y-%m-%d').date()
            employee_id = data['employee_id']
            source = data.get('source', 'MANUAL')
            
            # Validate employee exists
            employee = Employee.query.get(employee_id)
            if not employee:
                return jsonify({'error': 'Employee not found'}), 404
            
            # Get or create shift instance
            shift_instance = ShiftInstance.query.filter_by(
                shift_definition_id=shift_definition_id,
                date=instance_date
            ).first()
            
            if not shift_instance:
                # Create shift instance
                calendar_week = get_calendar_week(instance_date)
                month = get_month_string(instance_date)
                
                shift_instance = ShiftInstance(
                    shift_definition_id=shift_definition_id,
                    date=instance_date,
                    calendar_week=calendar_week,
                    month=month
                )
                db.session.add(shift_instance)
                db.session.flush()
            
            # Check if assignment already exists
            existing = Assignment.query.filter_by(
                employee_id=employee_id,
                shift_instance_id=shift_instance.id
            ).first()
            
            if existing:
                return jsonify({
                    'error': 'Assignment already exists for this employee and shift instance',
                    'id': existing.id
                }), 409
            
            assignment = Assignment(
                employee_id=employee_id,
                shift_instance_id=shift_instance.id,
                source=source
            )
            
            db.session.add(assignment)
            db.session.commit()
            
            return jsonify({
                'id': assignment.id,
                'employee_id': assignment.employee_id,
                'shift_instance_id': assignment.shift_instance_id,
                'source': assignment.source
            }), 201
        
        else:
            return jsonify({
                'error': 'Either provide (shift_instance_id + employee_id) or (shift_definition_id + date + employee_id)'
            }), 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/assignments/<int:assignment_id>', methods=['PUT'])
def update_assignment(assignment_id):
    """Update an assignment (change employee or source)"""
    try:
        assignment = Assignment.query.get_or_404(assignment_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update employee_id if provided
        if 'employee_id' in data:
            employee = Employee.query.get(data['employee_id'])
            if not employee:
                return jsonify({'error': 'Employee not found'}), 404
            
            # Check if new assignment would conflict
            existing = Assignment.query.filter(
                Assignment.id != assignment_id,
                Assignment.employee_id == data['employee_id'],
                Assignment.shift_instance_id == assignment.shift_instance_id
            ).first()
            
            if existing:
                return jsonify({'error': 'Assignment already exists for this employee and shift instance'}), 409
            
            assignment.employee_id = data['employee_id']
        
        # Update source if provided
        if 'source' in data:
            assignment.source = data['source']
        
        db.session.commit()
        
        return jsonify({
            'id': assignment.id,
            'employee_id': assignment.employee_id,
            'shift_instance_id': assignment.shift_instance_id,
            'source': assignment.source
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    """Delete an assignment"""
    try:
        assignment = Assignment.query.get_or_404(assignment_id)
        
        db.session.delete(assignment)
        db.session.commit()
        
        return jsonify({'message': 'Assignment deleted successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/reset-planning', methods=['POST'])
def reset_planning():
    """Delete all assignments in a date range"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['start_date', 'end_date']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        start_date = data['start_date']
        end_date = data['end_date']
        
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Find all assignments in the date range
        assignments_to_delete = db.session.query(Assignment).join(ShiftInstance).filter(
            ShiftInstance.date >= start_date,
            ShiftInstance.date <= end_date
        ).all()
        
        deleted_count = len(assignments_to_delete)
        
        # Delete all assignments
        for assignment in assignments_to_delete:
            db.session.delete(assignment)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully deleted {deleted_count} assignments',
            'deleted_count': deleted_count
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _parse_time_account_as_of_from_filename(filename):
    """
    Parse second date from filename like: Auswertung (29.01.2026 - 29.01.2026) 6d720
    Returns ISO date string (YYYY-MM-DD) or None.
    """
    if not filename:
        return None
    # Match (DD.MM.YYYY - DD.MM.YYYY), take second date (groups 4,5,6)
    m = re.search(r'\(\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*\)', filename)
    if not m:
        return None
    d2, m2, y2 = int(m.group(4)), int(m.group(5)), int(m.group(6))
    try:
        dt = date(y2, m2, d2)
        return dt.strftime('%Y-%m-%d')
    except ValueError:
        return None


@scheduling_bp.route('/time-accounts-upload', methods=['POST'])
def time_accounts_upload():
    """
    Upload Excel with columns 'Mitarbeiter' and 'Stundenkonto'.
    Updates employee.time_account by matching full name; saves stand date from filename in system_info.
    Filename example: Auswertung (29.01.2026 - 29.01.2026) 6d720 -> second date is used as time_account_as_of.
    """
    try:
        file = request.files.get('file')
        if not file or file.filename == '':
            return jsonify({'error': 'Keine Datei ausgewählt'}), 400

        filename = file.filename or ''
        as_of = _parse_time_account_as_of_from_filename(filename)
        if not as_of:
            return jsonify({'error': 'Stand-Datum konnte nicht aus dem Dateinamen gelesen werden (Format: Auswertung (DD.MM.YYYY - DD.MM.YYYY) ...)'}), 400

        buf = BytesIO(file.read())
        df = pd.read_excel(buf, engine='openpyxl')
        df.columns = [str(c).strip() for c in df.columns]

        if 'Mitarbeiter' not in df.columns or 'Stundenkonto' not in df.columns:
            return jsonify({
                'error': "Excel muss die Spalten 'Mitarbeiter' und 'Stundenkonto' enthalten",
                'columns': list(df.columns),
            }), 400

        employees = {f"{e.first_name} {e.last_name}": e for e in Employee.query.all()}
        updated = 0
        for _, row in df.iterrows():
            name = str(row.get('Mitarbeiter', '')).strip()
            if not name:
                continue
            emp = employees.get(name)
            if not emp:
                continue
            val = row.get('Stundenkonto')
            if pd.isna(val):
                emp.time_account = None
            else:
                try:
                    if isinstance(val, str):
                        val = float(val.replace(',', '.').strip())
                    else:
                        val = float(val)
                    emp.time_account = val
                except (ValueError, TypeError):
                    continue
            updated += 1

        SystemInfo.set_value('time_account_as_of', as_of)
        db.session.commit()

        return jsonify({
            'message': 'Stundenkonten aktualisiert',
            'time_account_as_of': as_of,
            'updated_count': updated,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/auto-plan', methods=['POST'])
def auto_plan():
    """Run automatic planning for a date range"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['start_date', 'end_date']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        start_date = data['start_date']
        end_date = data['end_date']
        
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Import here to avoid circular dependency
        from app.services.auto_planning_service import AutoPlanningService
        
        existing_handling = data.get('existing_assignments_handling', 'respect')
        allow_overplanning = data.get('allow_overplanning', False)
        include_aplano = data.get('include_aplano', False)
        time_limit_seconds = data.get('time_limit_seconds')
        
        service = AutoPlanningService(
            existing_assignments_handling=existing_handling,
            allow_overplanning=allow_overplanning,
            include_aplano=include_aplano
        )
        if time_limit_seconds is not None:
            try:
                service.time_limit_seconds = float(time_limit_seconds)
            except (TypeError, ValueError):
                pass
        
        result = service.plan(start_date, end_date)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
