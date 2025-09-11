from flask import Blueprint, request, jsonify, current_app
import os
from app import db
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.route import Route
from app.models.system_info import SystemInfo
from app.services.excel_import_service import ExcelImportService
from datetime import datetime

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('/', methods=['GET'])
def get_patients():
    calendar_week = request.args.get('calendar_week', type=int)
    area = request.args.get('area', type=str)
    
    query = Patient.query
    
    if calendar_week:
        query = query.filter_by(calendar_week=calendar_week)
    
    if area:
        query = query.filter_by(area=area)
    
    patients = query.all()
    return jsonify([patient.to_dict() for patient in patients]), 200

@patients_bp.route('/<int:id>', methods=['GET'])
def get_patient(id):
    patient = Patient.query.get_or_404(id)
    return jsonify(patient.to_dict()), 200

@patients_bp.route('/last-import-time', methods=['GET'])
def get_last_import_time():
    """Get the last patient import time"""
    last_import_time = SystemInfo.get_value('last_patient_import_time')
    return jsonify({
        "last_import_time": last_import_time
    }), 200

@patients_bp.route('/import', methods=['POST'])
def import_patients():
    """
    Import patients and appointments from an Excel file.
    This endpoint will:
    1. Delete all existing patients and appointments
    2. Import new patients from the Excel file
    3. Create new appointments based on the imported data
    """
    # Get directory path from config
    directory_path = current_app.config.get('PATIENTS_IMPORT_PATH')
    
    if not directory_path:
        return jsonify({"error": "PATIENTS_IMPORT_PATH not configured"}), 400
    
    # Validate directory path
    if not os.path.exists(directory_path):
        return jsonify({"error": f"Directory not found: {directory_path}"}), 400
    
    if not os.path.isdir(directory_path):
        return jsonify({"error": f"Path is not a directory: {directory_path}"}), 400
    
    # Find the newest Excel file in the directory
    excel_files = []
    for file in os.listdir(directory_path):
        if file.endswith(('.xlsx', '.xls')):
            file_path = os.path.join(directory_path, file)
            excel_files.append((file_path, os.path.getmtime(file_path)))
    
    if not excel_files:
        return jsonify({"error": f"No Excel files found in directory: {directory_path}"}), 400
    
    # Get the newest file
    newest_file = max(excel_files, key=lambda x: x[1])[0]
    
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
        print(f"Starting import from file: {newest_file}")
        result = ExcelImportService.import_patients(newest_file)
        patients = result['patients']
        appointments = result['appointments']
        
        # Get the calendar week
        calendar_week = patients[0].calendar_week if patients else None
        
        # Get the number of created routes (from the result dictionary)
        routes = result.get('routes', [])
        
        # Update last import time (use local timezone with timezone info)
        from datetime import timezone
        current_time = datetime.now(timezone.utc).astimezone().isoformat()
        SystemInfo.set_value('last_patient_import_time', current_time)
        
        # Prepare the response
        return jsonify({
            "message": f"Erfolgreich {len(patients)} Patienten, {len(appointments)} Termine und {len(routes)} Touren importiert",
            "patient_count": len(patients),
            "appointment_count": len(appointments),
            "route_count": len(routes),
            "deleted_count": {
                "patients": patient_count,
                "appointments": appointment_count,
                "routes": route_count
            },
            "calendar_week": calendar_week,
            "last_import_time": current_time
        }), 201
    
    except Exception as e:
        db.session.rollback()
        error_message = str(e)
        print(f"Error during import: {error_message}")
        return jsonify({"error": error_message}), 400