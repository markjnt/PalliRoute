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

        # Compute dates for the given ISO calendar week (current year)
        from datetime import date
        current_year = datetime.now().year
        def fmt(d: date) -> str:
            return d.strftime('%d.%m.%Y')
        iso_mon = date.fromisocalendar(current_year, calendar_week, 1)
        iso_tue = date.fromisocalendar(current_year, calendar_week, 2)
        iso_wed = date.fromisocalendar(current_year, calendar_week, 3)
        iso_thu = date.fromisocalendar(current_year, calendar_week, 4)
        iso_fri = date.fromisocalendar(current_year, calendar_week, 5)
        iso_sun = date.fromisocalendar(current_year, calendar_week, 7)
        weekday_date_labels = {
            'monday': fmt(iso_mon),
            'tuesday': fmt(iso_tue),
            'wednesday': fmt(iso_wed),
            'thursday': fmt(iso_thu),
            'friday': fmt(iso_fri),
        }
        period_label_weekdays = f"Zeitraum: {fmt(iso_mon)} - {fmt(iso_sun)} (KW: {calendar_week})"

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
            'weekday_counts_by_employee': {},
            'weekday_date_labels': weekday_date_labels,
            'period_label_weekdays': period_label_weekdays,
            'overview_data': [],
            'overview_planning': {},
        }
        
        # Prepare overview data (summary table)
        for emp_data in employee_routes_data:
            employee = emp_data['employee']
            overview_counts = { day: {'HB': 0, 'TK': 0, 'NA': 0} for day in weekdays }
            # Collect planning for overview (per weekday for this employee/week)
            planning_map = { day: None for day in weekdays }
            planning_entries_overview = EmployeePlanning.query.filter_by(
                employee_id=employee.id,
                calendar_week=calendar_week
            ).all()
            for planning in planning_entries_overview:
                if planning.weekday in weekdays:
                    planning_map[planning.weekday] = planning
            for weekday in weekdays:
                for vt in ('HB', 'TK', 'NA'):
                    cnt = Appointment.query.filter(
                        Appointment.employee_id == employee.id,
                        Appointment.weekday == weekday,
                        Appointment.calendar_week == calendar_week,
                        Appointment.visit_type == vt
                    ).count()
                    overview_counts[weekday][vt] = cnt
            template_data['overview_data'].append({
                'id': employee.id,
                'name': f"{employee.first_name} {employee.last_name}",
                'area': employee.area or '',
                'function': employee.function or '',
                'counts': overview_counts
            })
            template_data['overview_planning'][employee.id] = planning_map
        
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
            
            # Count all appointments for this employee by weekday and visit_type
            # This ensures accurate counts regardless of whether appointments are in routes
            for weekday in weekdays:
                appointments_for_day = Appointment.query.filter(
                    Appointment.employee_id == employee.id,
                    Appointment.weekday == weekday,
                    Appointment.calendar_week == calendar_week
                ).all()
                
                for appointment in appointments_for_day:
                    vt = (appointment.visit_type or '').upper()
                    if vt in ('HB', 'TK', 'NA'):
                        weekday_counts[weekday][vt] += 1

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
                            # Fill cell for this weekday (only for this employee)
                            if appointment.weekday in weekdays and appointment.employee_id == employee.id:
                                row['cells'][appointment.weekday] = {
                                    'visit_type': appointment.visit_type or '',
                                    'info': appointment.info or '',
                                    'origin_employee_id': appointment.origin_employee_id if appointment.origin_employee_id and appointment.origin_employee_id != appointment.employee_id else None
                                }
                            
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

        # Compute weekend dates for the given ISO calendar week (current year)
        from datetime import date
        current_year = datetime.now().year
        def fmt(d: date) -> str:
            return d.strftime('%d.%m.%Y')
        iso_mon = date.fromisocalendar(current_year, calendar_week, 1)
        iso_sat = date.fromisocalendar(current_year, calendar_week, 6)
        iso_sun = date.fromisocalendar(current_year, calendar_week, 7)
        weekend_date_labels = {
            'saturday': fmt(iso_sat),
            'sunday': fmt(iso_sun),
        }
        period_label_weekend = f"Zeitraum: {fmt(iso_mon)} - {fmt(iso_sun)} (KW: {calendar_week})"

        template_data = {
            'calendar_week': calendar_week,
            'employee_routes_data': employee_routes_data,
            'current_time': datetime.now().strftime('%d.%m.%Y %H:%M'),
            'appointments': {},
            'patients': {},
            'employees': {},
            'translate_weekday': PDFGenerator._translate_weekday,
            'weekend_date_labels': weekend_date_labels,
            'period_label_weekend': period_label_weekend,
            'weekend_counts_by_group': {},
            'overview_data': [],
        }
        
        # Prepare overview data for weekend (by area) with HB/TK/NA per day (Sat-Sun)
        weekdays_overview = ['saturday', 'sunday']
        area_overview = {}
        for emp_data in employee_routes_data:
            area_label = emp_data.get('area_label', 'Unbekannt')
            area_key = emp_data.get('area', '')
            if area_label not in area_overview:
                area_overview[area_label] = { day: {'HB': 0, 'TK': 0, 'NA': 0} for day in weekdays_overview }
            for weekday in weekdays_overview:
                for vt in ('HB', 'TK', 'NA'):
                    cnt = Appointment.query.join(
                        Patient, Appointment.patient_id == Patient.id
                    ).filter(
                        Patient.area == area_key,
                        Appointment.weekday == weekday,
                        Appointment.calendar_week == calendar_week,
                        Appointment.visit_type == vt
                    ).count()
                    area_overview[area_label][weekday][vt] += cnt
        for area_label, counts in area_overview.items():
            template_data['overview_data'].append({
                'name': area_label,
                'area': '',
                'function': '',
                'counts': counts
            })

        consolidated_by_employee = {}
        for emp_data in employee_routes_data:
            group_id = emp_data.get('group_id') or 'group-unknown'
            # Initialize counts for this group
            weekend_counts = {
                'saturday': {'HB': 0, 'TK': 0, 'NA': 0},
                'sunday': {'HB': 0, 'TK': 0, 'NA': 0}
            }

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
                        vt = (appointment.visit_type or '').upper()
                        if vt in ('HB', 'TK', 'NA'):
                            weekend_counts[appointment.weekday][vt] += 1

            # Override weekend_counts to count by AREA + WEEKDAY + CALENDAR_WEEK (not only routed)
            area_key = emp_data.get('area', '')
            for wd in ['saturday', 'sunday']:
                for vt in ('HB', 'TK', 'NA'):
                    cnt = Appointment.query.join(
                        Patient, Appointment.patient_id == Patient.id
                    ).filter(
                        Patient.area == area_key,
                        Appointment.weekday == wd,
                        Appointment.calendar_week == calendar_week,
                        Appointment.visit_type == vt
                    ).count()
                    weekend_counts[wd][vt] = cnt

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
            template_data['weekend_counts_by_group'][group_id] = weekend_counts

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