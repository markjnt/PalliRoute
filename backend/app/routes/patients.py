from flask import Blueprint, request, jsonify
from app import db
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.route import Route
from app.services.excel_import_service import ExcelImportService

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('/', methods=['GET'])
def get_patients():
    calendar_week = request.args.get('calendar_week', type=int)
    area = request.args.get('area', type=str)
    tour = request.args.get('tour', type=str)
    
    query = Patient.query
    
    if calendar_week:
        query = query.filter_by(calendar_week=calendar_week)
    
    if area:
        query = query.filter_by(area=area)
    
    if tour:
        query = query.filter_by(tour=tour)
    
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
        calendar_week=data.get('calendar_week'),
        area=data.get('area'),
        tour=data.get('tour')
    )
    
    db.session.add(new_patient)
    db.session.commit()
    
    return jsonify(new_patient.to_dict()), 201

@patients_bp.route('/<int:id>', methods=['PUT'])
def update_patient(id):
    patient = Patient.query.get_or_404(id)
    data = request.get_json()
    
    fields = ['first_name', 'last_name', 'street', 'zip_code', 'city', 
              'phone1', 'phone2', 'calendar_week', 'area', 'tour']
    
    for field in fields:
        if field in data:
            setattr(patient, field, data[field])
    
    db.session.commit()
    return jsonify(patient.to_dict()), 200

@patients_bp.route('/<int:id>', methods=['DELETE'])
def delete_patient(id):
    patient = Patient.query.get_or_404(id)
    # Also delete related appointments
    Appointment.query.filter_by(patient_id=id).delete()
    db.session.delete(patient)
    db.session.commit()
    return jsonify({"message": "Patient deleted successfully"}), 200

@patients_bp.route('/import', methods=['POST'])
def import_patients():
    """
    Import patients and appointments from an Excel file.
    This endpoint will:
    1. Delete all existing patients and appointments
    2. Import new patients from the Excel file
    3. Create new appointments based on the imported data
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"error": "File must be an Excel file (.xlsx or .xls)"}), 400
    
    try:
        # Clear the database first
        print(f"Clearing existing data...")
        appointment_count = Appointment.query.count()
        patient_count = Patient.query.count()
        route_count = Route.query.count()
        
        # Löschen in der richtigen Reihenfolge (wegen Fremdschlüsselbeziehungen)
        Route.query.delete()
        Appointment.query.delete()
        Patient.query.delete()
        
        db.session.commit()
        print(f"Deleted {route_count} routes, {appointment_count} appointments and {patient_count} patients")
        
        # Import the new data
        print(f"Starting import from file: {file.filename}")
        result = ExcelImportService.import_patients(file)
        patients = result['patients']
        appointments = result['appointments']
        
        # Get the calendar week
        calendar_week = patients[0].calendar_week if patients else None
        
        # Get the number of created routes (from the result dictionary)
        routes = result.get('routes', [])
        
        # Prepare the response
        return jsonify({
            "message": f"Successfully imported {len(patients)} patients, {len(appointments)} appointments, and {len(routes)} routes for calendar week {calendar_week}",
            "patient_count": len(patients),
            "appointment_count": len(appointments),
            "route_count": len(routes),
            "deleted_count": {
                "patients": patient_count,
                "appointments": appointment_count,
                "routes": route_count
            },
            "calendar_week": calendar_week
        }), 201
    
    except Exception as e:
        db.session.rollback()
        error_message = str(e)
        print(f"Error during import: {error_message}")
        return jsonify({"error": error_message}), 400