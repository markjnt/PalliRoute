from flask import Blueprint, request, jsonify
from app import db
from app.models.patient import Patient
from app.services.excel_service import ExcelService

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('/', methods=['GET'])
def get_patients():
    calendar_week = request.args.get('calendar_week', type=int)
    query = Patient.query
    
    if calendar_week:
        query = query.filter_by(calendar_week=calendar_week)
    
    patients = query.all()
    return jsonify([patient.to_dict() for patient in patients]), 200

@patients_bp.route('/<int:id>', methods=['GET'])
def get_patient(id):
    patient = Patient.query.get_or_404(id)
    return jsonify(patient.to_dict()), 200

@patients_bp.route('/', methods=['POST'])
def create_patient():
    data = request.get_json()
    
    required_fields = ['first_name', 'last_name', 'street', 'zip_code', 'city']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
    
    new_patient = Patient(
        first_name=data['first_name'],
        last_name=data['last_name'],
        street=data['street'],
        zip_code=data['zip_code'],
        city=data['city'],
        phone1=data.get('phone1'),
        phone2=data.get('phone2'),
        calendar_week=data.get('calendar_week')
    )
    
    db.session.add(new_patient)
    db.session.commit()
    
    return jsonify(new_patient.to_dict()), 201

@patients_bp.route('/<int:id>', methods=['PUT'])
def update_patient(id):
    patient = Patient.query.get_or_404(id)
    data = request.get_json()
    
    fields = ['first_name', 'last_name', 'street', 'zip_code', 'city', 
              'phone1', 'phone2', 'calendar_week']
    
    for field in fields:
        if field in data:
            setattr(patient, field, data[field])
    
    db.session.commit()
    return jsonify(patient.to_dict()), 200

@patients_bp.route('/<int:id>', methods=['DELETE'])
def delete_patient(id):
    patient = Patient.query.get_or_404(id)
    db.session.delete(patient)
    db.session.commit()
    return jsonify({"message": "Patient deleted successfully"}), 200

@patients_bp.route('/import', methods=['POST'])
def import_patients():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"error": "File must be an Excel file (.xlsx or .xls)"}), 400
    
    try:
        result = ExcelService.import_patients(file)
        patients = result['patients']
        appointments = result['appointments']
        
        # Add all patients to database
        for patient in patients:
            db.session.add(patient)
        db.session.flush()  # This assigns IDs to patients
        
        # Add appointments with correct patient_ids
        for appointment in appointments:
            db.session.add(appointment)
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully imported {len(patients)} patients and {len(appointments)} appointments",
            "patients": [patient.to_dict() for patient in patients],
            "appointments": [appointment.to_dict() for appointment in appointments]
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400