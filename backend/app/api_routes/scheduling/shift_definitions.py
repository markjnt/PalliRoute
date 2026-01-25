from flask import request, jsonify
from app import db
from app.models.scheduling import ShiftDefinition
from . import scheduling_bp


@scheduling_bp.route('/shift-definitions', methods=['GET'])
def get_shift_definitions():
    """Get all shift definitions with optional filtering"""
    try:
        query = ShiftDefinition.query
        
        # Filter by category
        category = request.args.get('category')
        if category:
            query = query.filter(ShiftDefinition.category == category)
        
        # Filter by role
        role = request.args.get('role')
        if role:
            query = query.filter(ShiftDefinition.role == role)
        
        # Filter by area
        area = request.args.get('area')
        if area:
            query = query.filter(ShiftDefinition.area == area)
        
        # Filter by time_of_day
        time_of_day = request.args.get('time_of_day')
        if time_of_day:
            query = query.filter(ShiftDefinition.time_of_day == time_of_day)
        
        # Filter by is_weekday
        is_weekday = request.args.get('is_weekday')
        if is_weekday is not None:
            query = query.filter(ShiftDefinition.is_weekday == (is_weekday.lower() == 'true'))
        
        # Filter by is_weekend
        is_weekend = request.args.get('is_weekend')
        if is_weekend is not None:
            query = query.filter(ShiftDefinition.is_weekend == (is_weekend.lower() == 'true'))
        
        definitions = query.all()
        
        return jsonify([{
            'id': d.id,
            'category': d.category,
            'role': d.role,
            'area': d.area,
            'time_of_day': d.time_of_day,
            'is_weekday': d.is_weekday,
            'is_weekend': d.is_weekend
        } for d in definitions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scheduling_bp.route('/shift-definitions', methods=['POST'])
def create_shift_definition():
    """Create a new shift definition"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['category', 'role', 'area', 'time_of_day', 'is_weekday', 'is_weekend']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Check for existing definition with same attributes
        existing = ShiftDefinition.query.filter_by(
            category=data['category'],
            role=data['role'],
            area=data['area'],
            time_of_day=data['time_of_day']
        ).first()
        
        if existing:
            return jsonify({
                'error': 'Shift definition with these attributes already exists',
                'id': existing.id
            }), 409
        
        definition = ShiftDefinition(
            category=data['category'],
            role=data['role'],
            area=data['area'],
            time_of_day=data['time_of_day'],
            is_weekday=bool(data['is_weekday']),
            is_weekend=bool(data['is_weekend'])
        )
        
        db.session.add(definition)
        db.session.commit()
        
        return jsonify({
            'id': definition.id,
            'category': definition.category,
            'role': definition.role,
            'area': definition.area,
            'time_of_day': definition.time_of_day,
            'is_weekday': definition.is_weekday,
            'is_weekend': definition.is_weekend
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
