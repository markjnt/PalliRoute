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
    def generate_route_pdf(routes, employee=None, area=None, calendar_week=None):
        """
        Generate a PDF for routes
        
        Args:
            routes: List of Route objects
            employee: Employee object (for employee routes)
            area: Area string (for weekend routes)
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
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.white,
            backColor=colors.HexColor('#007AFF'),
            spaceAfter=12,
            spaceBefore=12,
            leftIndent=10,
            rightIndent=10,
        )
        
        # Title
        if employee:
            title = f"Route: {employee.first_name} {employee.last_name}"
        elif area:
            title = f"Wochenend-Tour: {area}"
        else:
            title = "Route"
        
        elements.append(Paragraph(title, title_style))
        
        if calendar_week:
            elements.append(Paragraph(f"Kalenderwoche {calendar_week}", subtitle_style))
        
        # Employee Info Box (if employee route)
        if employee:
            info_style = ParagraphStyle(
                'EmployeeInfo',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#333333'),
                spaceAfter=10,
                leftIndent=10,
            )
            
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
        elif area:
            # Area Info Box (for weekend routes)
            info_style = ParagraphStyle(
                'AreaInfo',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#333333'),
                spaceAfter=10,
                leftIndent=10,
            )
            
            info_data = [
                ['<b>Gebiet:</b>', area],
                ['<b>Typ:</b>', 'Wochenend-Tour'],
            ]
            
            info_table = Table(info_data, colWidths=[4*cm, 10*cm])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff3e0')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#ffb74d')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            elements.append(info_table)
        
        elements.append(Spacer(1, 0.5*cm))
        
        # Process each route (day)
        for route in routes:
            appointment_ids = route.get_route_order()
            
            if not appointment_ids:
                continue
            
            # Check for replacement/planning info for this day
            replacement_info = ""
            if employee and calendar_week:
                planning = EmployeePlanning.query.filter_by(
                    employee_id=employee.id,
                    weekday=route.weekday,
                    calendar_week=calendar_week
                ).first()
                
                if planning:
                    if planning.status == 'vacation':
                        replacement_info = " • <font color='#FF9800'><b>Urlaub</b></font>"
                    elif planning.status == 'sick':
                        replacement_info = " • <font color='#f44336'><b>Krank</b></font>"
                    elif planning.status == 'custom' and planning.custom_text:
                        replacement_info = f" • <font color='#9C27B0'><b>{planning.custom_text}</b></font>"
                    
                    if planning.replacement_id:
                        replacement_employee = Employee.query.get(planning.replacement_id)
                        if replacement_employee:
                            replacement_info += f" • Vertretung: <b>{replacement_employee.first_name} {replacement_employee.last_name}</b>"
            
            # Day heading with summary
            weekday_de = PDFGenerator._translate_weekday(route.weekday)
            summary = f"{len(appointment_ids)} Termine • Dauer: {route.total_duration} min"
            if route.total_distance:
                summary += f" • Strecke: {round(route.total_distance, 1)} km"
            summary += replacement_info
            
            day_heading = f"<b>{weekday_de}</b><br/><font size=10>{summary}</font>"
            elements.append(Paragraph(day_heading, heading_style))
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
                
                # Format address for Google Maps
                address = f"{patient.street}, {patient.zip_code} {patient.city}"
                maps_url = f"https://www.google.com/maps/search/?api=1&query={address.replace(' ', '+')}"
                
                # Create clickable address link
                address_link = f'<a href="{maps_url}" color="blue">{address}</a>'
                
                # Format phone numbers with tel: links
                phone_text = ""
                if patient.phone1:
                    phone1_clean = patient.phone1.replace(' ', '').replace('-', '')
                    phone_text = f'<a href="tel:{phone1_clean}" color="blue">{patient.phone1}</a>'
                if patient.phone2:
                    phone2_clean = patient.phone2.replace(' ', '').replace('-', '')
                    if phone_text:
                        phone_text += f'<br/><a href="tel:{phone2_clean}" color="blue">{patient.phone2}</a>'
                    else:
                        phone_text = f'<a href="tel:{phone2_clean}" color="blue">{patient.phone2}</a>'
                
                time_str = appointment.time.strftime('%H:%M') if appointment.time else '-'
                
                row = [
                    str(idx),
                    Paragraph(patient_name, styles['Normal']),
                    Paragraph(address_link, styles['Normal']),
                    Paragraph(phone_text, styles['Normal']) if phone_text else '',
                    time_str,
                    appointment.visit_type,
                    f"{appointment.duration} min",
                    appointment.info or ''
                ]
                
                table_data.append(row)
            
            # Create table with adjusted column widths for replacement info
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
                ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Position column centered
                ('ALIGN', (4, 1), (4, -1), 'CENTER'),  # Time column centered
                ('ALIGN', (5, 1), (5, -1), 'CENTER'),  # Type column centered
                ('ALIGN', (6, 1), (6, -1), 'CENTER'),  # Duration column centered
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
