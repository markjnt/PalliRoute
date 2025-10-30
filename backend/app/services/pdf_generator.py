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
    def generate_calendar_week_pdf(employee_routes_data, calendar_week, selected_weekday='monday'):
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
        # Normalize selected weekday and compute ordering
        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        selected_weekday_norm = (selected_weekday or 'monday').lower()
        if selected_weekday_norm not in weekdays:
            selected_weekday_norm = 'monday'
        # Rendering order is always Monday..Friday; only sorting uses selected day
        weekday_order = weekdays[:]

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
            'download_map_image': PDFGenerator._download_map_image,
            'selected_weekday': selected_weekday_norm,
            'weekday_order': weekday_order,
            'weekday_labels': [PDFGenerator._translate_weekday(w) for w in weekday_order],
            'weekday_counts_by_employee': {}
        }
        
        # Collect all appointments, patients, employees, and planning data for template
        consolidated_by_employee = {}
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
            
            # Prepare consolidation structures per employee
            patient_rows = {}
            selected_day_order_ids = []
            weekday_counts = { day: {'HB': 0, 'TK': 0, 'NA': 0} for day in weekdays }

            # Collect appointments from routes
            for route in emp_data['routes']:
                appointment_ids = route.get_route_order()
                if route.weekday == selected_weekday_norm:
                    selected_day_order_ids = appointment_ids[:]
                for appointment_id in appointment_ids:
                    appointment = Appointment.query.get(appointment_id)
                    if appointment:
                        template_data['appointments'][appointment_id] = appointment
                        
                        patient = Patient.query.get(appointment.patient_id)
                        if patient:
                            template_data['patients'][appointment.patient_id] = patient
                            # Ensure row exists
                            row = patient_rows.get(patient.id)
                            if not row:
                                row = {
                                    'patient': patient,
                                    'cells': { day: {'visit_type': '', 'info': '', 'origin_employee_id': None} for day in weekdays }
                                }
                                patient_rows[patient.id] = row
                            # Fill cell for this weekday
                            if appointment.weekday in weekdays:
                                row['cells'][appointment.weekday] = {
                                    'visit_type': appointment.visit_type or '',
                                    'info': appointment.info or '',
                                    'origin_employee_id': appointment.origin_employee_id if appointment.origin_employee_id and appointment.origin_employee_id != appointment.employee_id else None
                                }
                                vt = (appointment.visit_type or '').upper()
                                if vt in ('HB', 'TK', 'NA'):
                                    weekday_counts[appointment.weekday][vt] += 1
                            
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
                        # Ensure row exists
                        row = patient_rows.get(patient.id)
                        if not row:
                            row = {
                                'patient': patient,
                                'cells': { day: {'visit_type': '', 'info': '', 'origin_employee_id': None} for day in weekdays }
                            }
                            patient_rows[patient.id] = row
                        # Fill cell
                        if appointment.weekday in weekdays and appointment.employee_id == employee.id:
                            row['cells'][appointment.weekday] = {
                                'visit_type': appointment.visit_type or '',
                                'info': appointment.info or '',
                                'origin_employee_id': appointment.origin_employee_id if appointment.origin_employee_id and appointment.origin_employee_id != appointment.employee_id else None
                            }
                            vt = (appointment.visit_type or '').upper()
                            if vt in ('HB', 'TK', 'NA'):
                                weekday_counts[appointment.weekday][vt] += 1
                        
                        # Also collect origin employee if it's a replacement
                        if appointment.origin_employee_id:
                            origin_employee = Employee.query.get(appointment.origin_employee_id)
                            if origin_employee:
                                template_data['employees'][origin_employee.id] = origin_employee

            # Build patient order based on selected day route; others appended
            selected_positions = {}
            order_counter = 0
            for appointment_id in selected_day_order_ids:
                appt = template_data['appointments'].get(appointment_id)
                if not appt:
                    continue
                if appt.employee_id != employee.id or appt.weekday != selected_weekday_norm:
                    continue
                pid = appt.patient_id
                if pid not in selected_positions:
                    selected_positions[pid] = order_counter
                    order_counter += 1

            def sort_key(item):
                patient_id, row = item
                pos = selected_positions.get(patient_id, 10**6)
                last_name = (row['patient'].last_name or '').lower()
                first_name = (row['patient'].first_name or '').lower()
                return (pos, last_name, first_name)

            sorted_rows = [r for _, r in sorted(patient_rows.items(), key=sort_key)]
            consolidated_by_employee[employee.id] = sorted_rows
            template_data['weekday_counts_by_employee'][employee.id] = weekday_counts

        template_data['consolidated_by_employee'] = consolidated_by_employee
        
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

    @staticmethod
    def generate_weekend_pdf(employee_routes_data, calendar_week):
        """
        Generate a PDF for weekend tours (Saturday/Sunday).
        - Sort rows by Saturday route order, append others alphabetically
        - No replacement/absence decorations
        - Two columns: Samstag, Sonntag
        """
        from jinja2 import Environment, FileSystemLoader
        weekdays = ['saturday', 'sunday']

        template_data = {
            'calendar_week': calendar_week,
            'employee_routes_data': employee_routes_data,
            'current_time': datetime.now().strftime('%d.%m.%Y %H:%M'),
            'appointments': {},
            'patients': {},
            'employees': {},
            'translate_weekday': PDFGenerator._translate_weekday,
        }

        consolidated_by_employee = {}
        for emp_data in employee_routes_data:
            group_id = emp_data.get('group_id') or 'group-unknown'

            patient_rows = {}
            saturday_order_ids = []
            
            for route in emp_data['routes']:
                appointment_ids = route.get_route_order()
                if route.weekday == 'saturday':
                    saturday_order_ids = appointment_ids[:]
                for appointment_id in appointment_ids:
                    appointment = Appointment.query.get(appointment_id)
                    if not appointment:
                        continue
                    template_data['appointments'][appointment_id] = appointment
                    patient = Patient.query.get(appointment.patient_id)
                    if not patient:
                        continue
                    template_data['patients'][patient.id] = patient
                    row = patient_rows.get(patient.id)
                    if not row:
                        row = {
                            'patient': patient,
                            'cells': { day: {'visit_type': '', 'info': ''} for day in weekdays }
                        }
                        patient_rows[patient.id] = row
                    if appointment.weekday in weekdays:
                        row['cells'][appointment.weekday] = {
                            'visit_type': appointment.visit_type or '',
                            'info': appointment.info or ''
                        }

            # Sorting: first by presence/order on Saturday, then alphabetically
            saturday_positions = {}
            order = 0
            for aid in saturday_order_ids:
                appt = template_data['appointments'].get(aid)
                if appt and appt.weekday == 'saturday':
                    pid = appt.patient_id
                    if pid not in saturday_positions:
                        saturday_positions[pid] = order
                        order += 1

            def sort_key(item):
                patient_id, row = item
                pos = saturday_positions.get(patient_id, 10**6)
                last_name = (row['patient'].last_name or '').lower()
                first_name = (row['patient'].first_name or '').lower()
                return (pos, last_name, first_name)

            sorted_rows = [r for _, r in sorted(patient_rows.items(), key=sort_key)]
            consolidated_by_employee[group_id] = sorted_rows

        template_data['consolidated_by_employee'] = consolidated_by_employee

        # Render using weekend template
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template('pdf_template_weekend.html')

        html_content = template.render(**template_data)
        buffer = BytesIO()
        font_config = FontConfiguration()
        HTML(string=html_content).write_pdf(buffer, font_config=font_config)
        return buffer