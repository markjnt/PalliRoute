from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from ..models.route import Route
from ..models.appointment import Appointment
from ..models.patient import Patient
from ..models.employee import Employee
from ..models.employee_planning import EmployeePlanning

class PDFGenerator:
    """Service for generating route PDFs"""
    
    @staticmethod
    def generate_calendar_week_pdf(employee_routes_data, calendar_week):
        """
        Generate a PDF for all employees in a calendar week
        Sorted by area (Nord/Süd), with each employee getting their own section
        
        Args:
            employee_routes_data: List of dicts with 'employee' and 'routes' keys
            calendar_week: Calendar week number
            
        Returns:
            BytesIO object containing the PDF
        """
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#007AFF'),
            spaceAfter=10,
            alignment=TA_CENTER,
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#666666'),
            spaceAfter=20,
            alignment=TA_CENTER,
        )
        
        employee_heading_style = ParagraphStyle(
            'EmployeeHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#007AFF'),
            spaceAfter=15,
            spaceBefore=20,
            borderWidth=2,
            borderColor=colors.HexColor('#007AFF'),
            borderPadding=10,
        )
        
        day_heading_style = ParagraphStyle(
            'DayHeading',
            parent=styles['Heading3'],
            fontSize=14,
            textColor=colors.white,
            backColor=colors.HexColor('#007AFF'),
            spaceAfter=12,
            spaceBefore=12,
            leftIndent=10,
            rightIndent=10,
        )
        
        # Title
        elements.append(Paragraph("Wochenübersicht Routen", title_style))
        elements.append(Paragraph(f"Kalenderwoche {calendar_week}", subtitle_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Process each employee
        for emp_data in employee_routes_data:
            employee = emp_data['employee']
            routes = emp_data['routes']
            
            # Employee section heading with info
            employee_name = f"{employee.first_name} {employee.last_name}"
            area_label = f" ({employee.area})" if employee.area else ""
            
            # Get total appointments across all days
            total_appointments = sum(len(route.get_route_order()) for route in routes)
            
            heading_text = f"{employee_name}{area_label} • {len(routes)} Tage • {total_appointments} Termine"
            elements.append(Paragraph(heading_text, employee_heading_style))
            
            # Employee info box
            info_data = [
                ['<b>Funktion:</b>', employee.function or '-'],
                ['<b>Stadt:</b>', employee.city or '-'],
                ['<b>Arbeitszeit:</b>', f"{employee.work_hours}%" if employee.work_hours else '-'],
                ['<b>Gebiet:</b>', employee.area or '-'],
            ]
            
            info_table = Table(info_data, colWidths=[4*cm, 10*cm])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            elements.append(info_table)
            elements.append(Spacer(1, 0.5*cm))
            
            # Process each route (day) for this employee
            for route in routes:
                appointment_ids = route.get_route_order()
                
                if not appointment_ids:
                    continue
                
                # Check for replacement/planning info for this day
                replacement_info = ""
                planning = EmployeePlanning.query.filter_by(
                    employee_id=employee.id,
                    weekday=route.weekday,
                    calendar_week=calendar_week
                ).first()
                
                if planning:
                    if getattr(planning, 'available', True) is False:
                        reason = planning.custom_text.strip() if planning.custom_text else 'Abwesend'
                        replacement_info = f" • <font color='#FF9800'><b>{reason}</b></font>"
                    
                    if planning.replacement_id:
                        replacement_employee = Employee.query.get(planning.replacement_id)
                        if replacement_employee:
                            replacement_info += f" • <b>Vertretung: {replacement_employee.first_name} {replacement_employee.last_name}</b>"
                
                # Day heading
                weekday_de = PDFGenerator._translate_weekday(route.weekday)
                summary = f"{len(appointment_ids)} Termine • Dauer: {route.total_duration} min"
                if route.total_distance:
                    summary += f" • Strecke: {round(route.total_distance, 1)} km"
                summary += replacement_info
                
                day_heading = f"<b>{weekday_de}</b><br/><font size=10>{summary}</font>"
                elements.append(Paragraph(day_heading, day_heading_style))
                elements.append(Spacer(1, 0.3*cm))
                
                # Table data
                table_data = [
                    ['#', 'Patient', 'Adresse', 'Telefon', 'Zeit', 'Typ', 'Dauer', 'Info']
                ]
                
                for idx, appointment_id in enumerate(appointment_ids, 1):
                    appointment = Appointment.query.get(appointment_id)
                    if not appointment:
                        continue
                        
                    patient = Patient.query.get(appointment.patient_id)
                    if not patient:
                        continue
                    
                    # Check if this appointment is being done as replacement
                    patient_name = f"{patient.first_name} {patient.last_name}"
                    if appointment.origin_employee_id and appointment.origin_employee_id != appointment.employee_id:
                        origin_employee = Employee.query.get(appointment.origin_employee_id)
                        if origin_employee:
                            patient_name += f'<br/><font size=7 color="#666">(urspr. {origin_employee.first_name} {origin_employee.last_name})</font>'
                    
                    # Format address
                    address = f"{patient.street}, {patient.zip_code} {patient.city}"
                    
                    # Format phone numbers
                    phone_text = ""
                    if patient.phone1:
                        phone_text = patient.phone1
                    if patient.phone2:
                        if phone_text:
                            phone_text += f'<br/>{patient.phone2}'
                        else:
                            phone_text = patient.phone2
                    
                    time_str = appointment.time.strftime('%H:%M') if appointment.time else '-'
                    
                    row = [
                        str(idx),
                        Paragraph(patient_name, styles['Normal']),
                        address,
                        Paragraph(phone_text, styles['Normal']) if phone_text else '',
                        time_str,
                        appointment.visit_type,
                        f"{appointment.duration} min",
                        appointment.info or ''
                    ]
                    
                    table_data.append(row)
                
                # Create table
                col_widths = [0.7*cm, 3.8*cm, 4.2*cm, 2.3*cm, 1.1*cm, 0.9*cm, 1.1*cm, 2.6*cm]
                
                table = Table(table_data, colWidths=col_widths)
                table.setStyle(TableStyle([
                    # Header styling
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5f5f5')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#333333')),
                    ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('TOPPADDING', (0, 0), (-1, 0), 8),
                    
                    # Data cells styling
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Position column
                    ('ALIGN', (4, 1), (4, -1), 'CENTER'),  # Time column
                    ('ALIGN', (5, 1), (5, -1), 'CENTER'),  # Type column
                    ('ALIGN', (6, 1), (6, -1), 'CENTER'),  # Duration column
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 1), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    
                    # Grid
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                    
                    # Alternating row colors
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
                ]))
                
                elements.append(table)
                elements.append(Spacer(1, 0.8*cm))
            
            # Add page break between employees
            elements.append(PageBreak())
        
        # Footer
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#999999'),
            alignment=TA_CENTER,
        )
        
        now = datetime.now().strftime('%d.%m.%Y %H:%M')
        footer_text = f"Erstellt am {now} • PalliRoute"
        elements.append(Spacer(1, 1*cm))
        elements.append(Paragraph(footer_text, footer_style))
        
        # Build PDF
        doc.build(elements)
        
        buffer.seek(0)
        return buffer
    
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
