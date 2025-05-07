from flask import Blueprint, request, jsonify, send_file
from app import db
from app.models.employee import Employee
from app.models.route import Route
from app.models.appointment import Appointment
from app.services.excel_import_service import ExcelImportService
import pandas as pd
from io import BytesIO
import openpyxl

employees_bp = Blueprint('employees', __name__)

@employees_bp.route('/', methods=['GET'])
def get_employees():
    is_active = request.args.get('active', type=bool)
    query = Employee.query
    
    if is_active is not None:
        query = query.filter_by(is_active=is_active)
    
    employees = query.all()
    return jsonify([employee.to_dict() for employee in employees]), 200

@employees_bp.route('/<int:id>', methods=['GET'])
def get_employee(id):
    employee = Employee.query.get_or_404(id)
    return jsonify(employee.to_dict()), 200

@employees_bp.route('/', methods=['POST'])
def create_employee():
    data = request.get_json()
    
    required_fields = ['first_name', 'last_name', 'street', 'zip_code', 'city', 'function', 'work_hours']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
    
    # Check if employee already exists
    existing_employee = Employee.query.filter_by(
        first_name=data['first_name'],
        last_name=data['last_name']
    ).first()
    
    if existing_employee:
        return jsonify({"error": f"Ein Mitarbeiter mit dem Namen {data['first_name']} {data['last_name']} existiert bereits"}), 400
    
    # Check if tour_number already exists (if provided)
    if 'tour_number' in data and data['tour_number'] is not None:
        existing_tour = Employee.query.filter_by(tour_number=data['tour_number']).first()
        if existing_tour:
            return jsonify({"error": f"Ein Mitarbeiter mit der Tournummer {data['tour_number']} existiert bereits"}), 400
    
    # Validate work_hours
    work_hours = data['work_hours']
    if not isinstance(work_hours, (int, float)) or work_hours < 0 or work_hours > 100:
        return jsonify({"error": "Stellenumfang muss zwischen 0 und 100 liegen"}), 400
    
    new_employee = Employee(
        first_name=data['first_name'],
        last_name=data['last_name'],
        street=data['street'],
        zip_code=data['zip_code'],
        city=data['city'],
        function=data['function'],
        work_hours=work_hours,
        tour_number=data.get('tour_number'),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(new_employee)
    db.session.commit()
    
    return jsonify(new_employee.to_dict()), 201

@employees_bp.route('/<int:id>', methods=['PUT'])
def update_employee(id):
    employee = Employee.query.get_or_404(id)
    data = request.get_json()
    
    # Validate work_hours if provided
    if 'work_hours' in data:
        work_hours = data['work_hours']
        if not isinstance(work_hours, (int, float)) or work_hours < 0 or work_hours > 100:
            return jsonify({"error": "Stellenumfang muss zwischen 0 und 100 liegen"}), 400
    
    # Check if tour_number already exists (if being updated)
    if 'tour_number' in data and data['tour_number'] is not None:
        existing_tour = Employee.query.filter(
            Employee.tour_number == data['tour_number'],
            Employee.id != id
        ).first()
        if existing_tour:
            return jsonify({"error": f"Ein Mitarbeiter mit der Tournummer {data['tour_number']} existiert bereits"}), 400
    
    fields = ['first_name', 'last_name', 'street', 'zip_code', 'city', 
              'function', 'work_hours', 'tour_number', 'is_active']
    
    for field in fields:
        if field in data:
            setattr(employee, field, data[field])
    
    db.session.commit()
    return jsonify(employee.to_dict()), 200

@employees_bp.route('/<int:id>', methods=['DELETE'])
def delete_employee(id):
    try:
        employee = Employee.query.get_or_404(id)
        
        # Delete related routes first
        Route.query.filter_by(employee_id=id).delete()
        
        # Delete related appointments
        Appointment.query.filter_by(employee_id=id).delete()
        
        # Now delete the employee
        db.session.delete(employee)
        db.session.commit()
        
        return jsonify({"message": "Employee deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete employee: {str(e)}"}), 500

@employees_bp.route('/import', methods=['POST'])
def import_employees():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"error": "File must be an Excel file (.xlsx or .xls)"}), 400
    
    try:
        result = ExcelImportService.import_employees(file)
        added_employees = result['added']
        updated_employees = result['updated']
        
        message = f"Successfully processed {len(added_employees) + len(updated_employees)} employees"
        if added_employees and updated_employees:
            message += f" ({len(added_employees)} neu hinzugefügt, {len(updated_employees)} aktualisiert)"
        elif added_employees:
            message += f" ({len(added_employees)} neu hinzugefügt)"
        elif updated_employees:
            message += f" ({len(updated_employees)} aktualisiert)"
            
        return jsonify({
            "message": message,
            "added_employees": [emp.to_dict() for emp in added_employees],
            "updated_employees": [emp.to_dict() for emp in updated_employees]
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@employees_bp.route('/export', methods=['GET'])
def export_employees():
    employees = Employee.query.all()
    
    # Create DataFrame
    data = []
    for emp in employees:
        data.append({
            'Vorname': emp.first_name,
            'Nachname': emp.last_name,
            'Straße': emp.street,
            'PLZ': emp.zip_code,
            'Ort': emp.city,
            'Funktion': emp.function,
            'Stellenumfang': f'{emp.work_hours}%',
            'Tournummer': emp.tour_number if emp.tour_number is not None else '',
            'Aktiv': 'Ja' if emp.is_active else 'Nein'
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='employees.xlsx'
    )