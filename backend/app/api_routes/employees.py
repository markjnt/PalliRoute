from flask import Blueprint, request, jsonify, current_app
import os
from app import db
from app.models.employee import Employee
from app.models.route import Route
from app.models.appointment import Appointment
from app.models.employee_planning import EmployeePlanning
from app.services.excel_import_service import ExcelImportService

employees_bp = Blueprint('employees', __name__)

@employees_bp.route('/', methods=['GET'])
def get_employees():
    employees = Employee.query.all()
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
        area=data.get('area'),
        alias=data.get('alias')
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
    

    
    fields = ['first_name', 'last_name', 'street', 'zip_code', 'city', 
              'function', 'work_hours', 'area', 'alias']
    
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
        
        # Delete related employee planning
        EmployeePlanning.query.filter_by(employee_id=id).delete()
        
        # Now delete the employee
        db.session.delete(employee)
        db.session.commit()
        
        return jsonify({"message": "Employee deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete employee: {str(e)}"}), 500

@employees_bp.route('/import', methods=['POST'])
def import_employees():
    # Get directory path from config
    directory_path = current_app.config.get('EMPLOYEES_IMPORT_PATH')
    
    if not directory_path:
        return jsonify({"error": "EMPLOYEES_IMPORT_PATH not configured"}), 400
    
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
        result = ExcelImportService.import_employees(newest_file)
        added_employees = result['added']
        updated_employees = result['updated']
        removed_employees = result['removed']
        
        # Create detailed message
        total_processed = len(added_employees) + len(updated_employees) + len(removed_employees)
        message_parts = []
        
        if added_employees:
            message_parts.append(f"{len(added_employees)} hinzugefügt")
        if updated_employees:
            message_parts.append(f"{len(updated_employees)} aktualisiert")
        if removed_employees:
            message_parts.append(f"{len(removed_employees)} entfernt")
        
        if message_parts:
            message = f"Import erfolgreich: {', '.join(message_parts)}"
        else:
            message = "Keine Änderungen erforderlich"
            
        return jsonify({
            "message": message,
            "summary": {
                "total_processed": total_processed,
                "added": len(added_employees),
                "updated": len(updated_employees),
                "removed": len(removed_employees)
            },
            "added_employees": [emp.to_dict() for emp in added_employees],
            "updated_employees": [emp.to_dict() for emp in updated_employees],
            "removed_employees": [emp.to_dict() for emp in removed_employees]
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
