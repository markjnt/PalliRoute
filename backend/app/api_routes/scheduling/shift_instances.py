from flask import request, jsonify
from datetime import datetime, date
from app import db
from app.models.scheduling import ShiftDefinition, ShiftInstance
from calendar import monthrange
from . import scheduling_bp


def get_calendar_week(dt):
    """Get ISO calendar week number from date"""
    return dt.isocalendar()[1]


def get_month_string(dt):
    """Get month string in YYYY-MM format"""
    return dt.strftime('%Y-%m')


@scheduling_bp.route('/shift-instances', methods=['GET'])
def get_shift_instances():
    """Get shift instances with optional filtering"""
    try:
        query = db.session.query(ShiftInstance).join(ShiftDefinition)
        
        # Filter by date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(ShiftInstance.date >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(ShiftInstance.date <= end_date)
        
        # Filter by month
        month = request.args.get('month')
        if month:
            query = query.filter(ShiftInstance.month == month)
        
        # Filter by calendar week
        calendar_week = request.args.get('calendar_week', type=int)
        if calendar_week:
            query = query.filter(ShiftInstance.calendar_week == calendar_week)
        
        # Filter by shift_definition_id
        shift_definition_id = request.args.get('shift_definition_id', type=int)
        if shift_definition_id:
            query = query.filter(ShiftInstance.shift_definition_id == shift_definition_id)
        
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
        
        instances = query.all()
        
        return jsonify([{
            'id': inst.id,
            'date': inst.date.isoformat(),
            'calendar_week': inst.calendar_week,
            'month': inst.month,
            'shift_definition_id': inst.shift_definition_id,
            'shift_definition': {
                'id': inst.shift_definition.id,
                'category': inst.shift_definition.category,
                'role': inst.shift_definition.role,
                'area': inst.shift_definition.area,
                'time_of_day': inst.shift_definition.time_of_day,
                'is_weekday': inst.shift_definition.is_weekday,
                'is_weekend': inst.shift_definition.is_weekend
            }
        } for inst in instances]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/shift-instances', methods=['POST'])
def create_shift_instance():
    """Create or get a shift instance"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Option 1: Provide shift_definition_id + date
        if 'shift_definition_id' in data and 'date' in data:
            shift_definition_id = data['shift_definition_id']
            instance_date = data['date']
            if isinstance(instance_date, str):
                instance_date = datetime.strptime(instance_date, '%Y-%m-%d').date()
            
            # Check if instance already exists
            existing = ShiftInstance.query.filter_by(
                shift_definition_id=shift_definition_id,
                date=instance_date
            ).first()
            
            if existing:
                return jsonify({
                    'id': existing.id,
                    'date': existing.date.isoformat(),
                    'calendar_week': existing.calendar_week,
                    'month': existing.month,
                    'shift_definition_id': existing.shift_definition_id,
                    'shift_definition': {
                        'id': existing.shift_definition.id,
                        'category': existing.shift_definition.category,
                        'role': existing.shift_definition.role,
                        'area': existing.shift_definition.area,
                        'time_of_day': existing.shift_definition.time_of_day
                    }
                }), 200
            
            # Verify shift definition exists
            shift_def = ShiftDefinition.query.get(shift_definition_id)
            if not shift_def:
                return jsonify({'error': 'Shift definition not found'}), 404
            
            calendar_week = get_calendar_week(instance_date)
            month = get_month_string(instance_date)
            
            instance = ShiftInstance(
                shift_definition_id=shift_definition_id,
                date=instance_date,
                calendar_week=calendar_week,
                month=month
            )
            
            db.session.add(instance)
            db.session.commit()
            
            return jsonify({
                'id': instance.id,
                'date': instance.date.isoformat(),
                'calendar_week': instance.calendar_week,
                'month': instance.month,
                'shift_definition_id': instance.shift_definition_id,
                'shift_definition': {
                    'id': instance.shift_definition.id,
                    'category': instance.shift_definition.category,
                    'role': instance.shift_definition.role,
                    'area': instance.shift_definition.area,
                    'time_of_day': instance.shift_definition.time_of_day
                }
            }), 201
        
        # Option 2: Provide category + role + area + time_of_day + date (find/create definition)
        elif all(key in data for key in ['category', 'role', 'area', 'time_of_day', 'date']):
            instance_date = data['date']
            if isinstance(instance_date, str):
                instance_date = datetime.strptime(instance_date, '%Y-%m-%d').date()
            
            # Find or create shift definition
            shift_def = ShiftDefinition.query.filter_by(
                category=data['category'],
                role=data['role'],
                area=data['area'],
                time_of_day=data['time_of_day']
            ).first()
            
            if not shift_def:
                # Determine is_weekday/is_weekend from date
                weekday = instance_date.weekday() < 5
                weekend = instance_date.weekday() >= 5
                
                shift_def = ShiftDefinition(
                    category=data['category'],
                    role=data['role'],
                    area=data['area'],
                    time_of_day=data['time_of_day'],
                    is_weekday=weekday,
                    is_weekend=weekend
                )
                db.session.add(shift_def)
                db.session.flush()
            
            # Check if instance already exists
            existing = ShiftInstance.query.filter_by(
                shift_definition_id=shift_def.id,
                date=instance_date
            ).first()
            
            if existing:
                return jsonify({
                    'id': existing.id,
                    'date': existing.date.isoformat(),
                    'calendar_week': existing.calendar_week,
                    'month': existing.month,
                    'shift_definition_id': existing.shift_definition_id,
                    'shift_definition': {
                        'id': existing.shift_definition.id,
                        'category': existing.shift_definition.category,
                        'role': existing.shift_definition.role,
                        'area': existing.shift_definition.area,
                        'time_of_day': existing.shift_definition.time_of_day
                    }
                }), 200
            
            calendar_week = get_calendar_week(instance_date)
            month = get_month_string(instance_date)
            
            instance = ShiftInstance(
                shift_definition_id=shift_def.id,
                date=instance_date,
                calendar_week=calendar_week,
                month=month
            )
            
            db.session.add(instance)
            db.session.commit()
            
            return jsonify({
                'id': instance.id,
                'date': instance.date.isoformat(),
                'calendar_week': instance.calendar_week,
                'month': instance.month,
                'shift_definition_id': instance.shift_definition_id,
                'shift_definition': {
                    'id': instance.shift_definition.id,
                    'category': instance.shift_definition.category,
                    'role': instance.shift_definition.role,
                    'area': instance.shift_definition.area,
                    'time_of_day': instance.shift_definition.time_of_day
                }
            }), 201
        
        else:
            return jsonify({
                'error': 'Either provide (shift_definition_id + date) or (category + role + area + time_of_day + date)'
            }), 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/shift-instances/generate', methods=['POST'])
def generate_shift_instances():
    """Bulk generate shift instances for a month based on shift definitions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        month = data.get('month')  # Format: "YYYY-MM"
        if not month:
            return jsonify({'error': 'month is required (format: YYYY-MM)'}), 400
        
        # Parse month
        year, month_num = map(int, month.split('-'))
        
        # Get shift definitions (optionally filtered)
        query = ShiftDefinition.query
        if 'category' in data:
            query = query.filter(ShiftDefinition.category == data['category'])
        if 'role' in data:
            query = query.filter(ShiftDefinition.role == data['role'])
        if 'area' in data:
            query = query.filter(ShiftDefinition.area == data['area'])
        
        shift_definitions = query.all()
        
        if not shift_definitions:
            return jsonify({'error': 'No shift definitions found matching criteria'}), 404
        
        # Get all dates in the month
        _, last_day = monthrange(year, month_num)
        instances_created = []
        instances_existing = []
        
        for day in range(1, last_day + 1):
            instance_date = date(year, month_num, day)
            
            # Determine if this date matches the shift definition's weekday/weekend requirement
            is_weekday = instance_date.weekday() < 5
            is_weekend = instance_date.weekday() >= 5
            
            for shift_def in shift_definitions:
                # Skip if date doesn't match weekday/weekend requirement
                if is_weekday and not shift_def.is_weekday:
                    continue
                if is_weekend and not shift_def.is_weekend:
                    continue
                
                # Check if instance already exists
                existing = ShiftInstance.query.filter_by(
                    shift_definition_id=shift_def.id,
                    date=instance_date
                ).first()
                
                if existing:
                    instances_existing.append(existing.id)
                    continue
                
                calendar_week = get_calendar_week(instance_date)
                
                instance = ShiftInstance(
                    shift_definition_id=shift_def.id,
                    date=instance_date,
                    calendar_week=calendar_week,
                    month=month
                )
                
                db.session.add(instance)
                instances_created.append({
                    'id': instance.id,
                    'date': instance_date.isoformat(),
                    'shift_definition_id': shift_def.id
                })
        
        db.session.commit()
        
        return jsonify({
            'message': 'Shift instances generated',
            'month': month,
            'created': len(instances_created),
            'existing': len(instances_existing),
            'instances': instances_created
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
