from flask import Blueprint, jsonify, request
from app import db
from app.models.appointment import Appointment
from datetime import datetime

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/', methods=['GET'])
def get_appointments():
    # Optional filters
    patient_id = request.args.get('patient_id', type=int)
    employee_id = request.args.get('employee_id', type=int)
    weekday = request.args.get('weekday')
    
    query = Appointment.query
    
    if patient_id:
        query = query.filter_by(patient_id=patient_id)
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if weekday:
        query = query.filter_by(weekday=weekday.lower())
    
    appointments = query.all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointments_bp.route('/<int:id>', methods=['GET'])
def get_appointment(id):
    appointment = Appointment.query.get_or_404(id)
    return jsonify(appointment.to_dict())

@appointments_bp.route('/', methods=['POST'])
def create_appointment():
    data = request.get_json()
    appointment = Appointment.from_dict(data)
    db.session.add(appointment)
    db.session.commit()
    return jsonify(appointment.to_dict()), 201

@appointments_bp.route('/<int:id>', methods=['PUT'])
def update_appointment(id):
    appointment = Appointment.query.get_or_404(id)
    data = request.get_json()
    
    # Update employee assignment
    if 'employee_id' in data:
        appointment.employee_id = data['employee_id']
    
    # Update time if provided
    if 'time' in data:
        try:
            time_obj = datetime.strptime(data['time'], '%H:%M').time()
            appointment.time = time_obj
        except ValueError:
            return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400
    
    # Update visit type and recalculate duration
    if 'visit_type' in data:
        visit_type = data['visit_type']
        if visit_type not in ['HB', 'NA', 'TK']:
            return jsonify({'error': 'Invalid visit type. Use HB, NA, or TK'}), 400
        
        appointment.visit_type = visit_type
        appointment.duration = {
            'HB': 25,   # Hausbesuch: 25 minutes
            'NA': 120,  # Nachtbesuch: 120 minutes
            'TK': 0     # Telefonkontakt: 0 minutes
        }[visit_type]
    
    db.session.commit()
    return jsonify(appointment.to_dict())

@appointments_bp.route('/<int:id>', methods=['DELETE'])
def delete_appointment(id):
    appointment = Appointment.query.get_or_404(id)
    db.session.delete(appointment)
    db.session.commit()
    return '', 204

@appointments_bp.route('/batch', methods=['POST'])
def batch_update_appointments():
    """Update multiple appointments at once, typically for assigning employees to routes"""
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error': 'Expected a list of appointment updates'}), 400
    
    try:
        for update in data:
            appointment_id = update.get('id')
            employee_id = update.get('employee_id')
            
            if not appointment_id:
                continue
                
            appointment = Appointment.query.get(appointment_id)
            if appointment:
                appointment.employee_id = employee_id
        
        db.session.commit()
        return jsonify({'message': 'Successfully updated appointments'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update appointments: {str(e)}'}), 400 