from flask import Blueprint, request, jsonify, send_file
from app import db
from app.models.employee import Employee
from app.services.excel_service import ExcelService
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
    
    new_employee = Employee(
        first_name=data['first_name'],
        last_name=data['last_name'],
        street=data['street'],
        zip_code=data['zip_code'],
        city=data['city'],
        function=data['function'],
        work_hours=data['work_hours'],
        is_active=data.get('is_active', True)
    )
    
    db.session.add(new_employee)
    db.session.commit()
    
    return jsonify(new_employee.to_dict()), 201

@employees_bp.route('/<int:id>', methods=['PUT'])
def update_employee(id):
    employee = Employee.query.get_or_404(id)
    data = request.get_json()
    
    fields = ['first_name', 'last_name', 'street', 'zip_code', 'city', 
              'function', 'work_hours', 'is_active']
    
    for field in fields:
        if field in data:
            setattr(employee, field, data[field])
    
    db.session.commit()
    return jsonify(employee.to_dict()), 200

@employees_bp.route('/<int:id>', methods=['DELETE'])
def delete_employee(id):
    employee = Employee.query.get_or_404(id)
    db.session.delete(employee)
    db.session.commit()
    return jsonify({"message": "Employee deleted successfully"}), 200

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
        imported_employees = ExcelService.import_employees(file)
        return jsonify({
            "message": f"Successfully imported {len(imported_employees)} employees",
            "employees": [emp.to_dict() for emp in imported_employees]
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
            'Stellenumfang': f'{emp.work_hours * 100}%',
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