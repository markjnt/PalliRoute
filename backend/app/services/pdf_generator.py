from io import BytesIO
from datetime import datetime
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
from jinja2 import Environment, FileSystemLoader
import os
import requests
import base64
from ..models.route import Route
from ..models.appointment import Appointment
from ..models.patient import Patient
from ..models.employee import Employee
from ..models.employee_planning import EmployeePlanning

class PDFGenerator:
    """Service for generating route PDFs using WeasyPrint"""
    
    @staticmethod
    def _translate_weekday(weekday):
        """Translate English weekday to German"""
        translations = {
            'monday': 'Montag',
            'tuesday': 'Dienstag',
            'wednesday': 'Mittwoch',
            'thursday': 'Donnerstag',
            'friday': 'Freitag',
            'saturday': 'Samstag',
            'sunday': 'Sonntag',
        }
        return translations.get(weekday.lower(), weekday.capitalize())
    
    @staticmethod
    def _download_map_image(map_url):
        """Download Google Maps image and convert to base64"""
        try:
            response = requests.get(map_url, timeout=10)
            response.raise_for_status()
            
            # Convert to base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')
            return f"data:image/png;base64,{image_base64}"
        except Exception as e:
            print(f"Error downloading map image: {e}")
            return None
    
    
    @staticmethod
    def generate_calendar_week_pdf(employee_routes_data, calendar_week):
        """
        Generate a PDF for all employees in a calendar week using WeasyPrint
        Sorted by function and area, with each employee getting their own section
        
        Args:
            employee_routes_data: List of dicts with 'employee' and 'routes' keys
            calendar_week: Calendar week number
            
        Returns:
            BytesIO object containing the PDF
        """
        # Prepare data for template
        template_data = {
            'calendar_week': calendar_week,
            'employee_routes_data': employee_routes_data,
            'current_time': datetime.now().strftime('%d.%m.%Y %H:%M'),
            'appointments': {},
            'patients': {},
            'employees': {},
            'employee_planning': {},
            'translate_weekday': PDFGenerator._translate_weekday,
            'google_maps_api_key': os.getenv('GOOGLE_MAPS_API_KEY', ''),
            'download_map_image': PDFGenerator._download_map_image
        }
        
        # Collect all appointments, patients, employees, and planning data for template
        for emp_data in employee_routes_data:
            employee = emp_data['employee']
            template_data['employees'][employee.id] = employee
            
            # Collect employee planning data for this employee and calendar week
            planning_entries = EmployeePlanning.query.filter_by(
                employee_id=employee.id,
                calendar_week=calendar_week
            ).all()
            
            for planning in planning_entries:
                planning_key = f"{employee.id}_{planning.weekday}"
                template_data['employee_planning'][planning_key] = planning
                
                # Also collect replacement employee if exists
                if planning.replacement_id:
                    replacement_employee = Employee.query.get(planning.replacement_id)
                    if replacement_employee:
                        template_data['employees'][replacement_employee.id] = replacement_employee
            
            # Collect appointments from routes
            for route in emp_data['routes']:
                appointment_ids = route.get_route_order()
                for appointment_id in appointment_ids:
                    appointment = Appointment.query.get(appointment_id)
                    if appointment:
                        template_data['appointments'][appointment_id] = appointment
                        
                        patient = Patient.query.get(appointment.patient_id)
                        if patient:
                            template_data['patients'][appointment.patient_id] = patient
                            
                            # Also collect origin employee if it's a replacement
                            if appointment.origin_employee_id:
                                origin_employee = Employee.query.get(appointment.origin_employee_id)
                                if origin_employee:
                                    template_data['employees'][origin_employee.id] = origin_employee
            
            # Collect direct appointments (not in routes) - like TK appointments
            if 'appointments' in emp_data:
                for appointment in emp_data['appointments']:
                    template_data['appointments'][appointment.id] = appointment
                    
                    patient = Patient.query.get(appointment.patient_id)
                    if patient:
                        template_data['patients'][appointment.patient_id] = patient
                        
                        # Also collect origin employee if it's a replacement
                        if appointment.origin_employee_id:
                            origin_employee = Employee.query.get(appointment.origin_employee_id)
                            if origin_employee:
                                template_data['employees'][origin_employee.id] = origin_employee
        
        # Get template directory
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template('pdf_template.html')
        
        # Render HTML
        html_content = template.render(**template_data)
        
        # Generate PDF with WeasyPrint
        buffer = BytesIO()
        
        # Configure font settings for better rendering
        font_config = FontConfiguration()
        
        # Generate PDF
        html_doc = HTML(string=html_content)
        html_doc.write_pdf(buffer, font_config=font_config)
        
        return buffer