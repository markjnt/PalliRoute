from typing import List, Dict
import pandas as pd
from datetime import datetime
from io import BytesIO
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route

class ExcelExportService:
    @staticmethod
    def export_routes(date: datetime, routes_data: List[Dict]) -> BytesIO:
        """
        Export routes to Excel
        routes_data: List of dictionaries containing route info with employee and appointments
        Returns: BytesIO object containing the Excel file
        """
        # Create Excel writer object
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Create overview sheet
            overview_data = []
            for route_info in routes_data:
                employee = route_info['employee']
                route = route_info['route']
                overview_data.append({
                    'Mitarbeiter': f"{employee.first_name} {employee.last_name}",
                    'Anzahl Termine': len(route_info['appointments']),
                    'Gesamtdauer (Min)': route.total_duration
                })
            
            if overview_data:
                overview_df = pd.DataFrame(overview_data)
                overview_df.to_excel(writer, sheet_name='Übersicht', index=False)

            # Create detailed route sheets
            for route_info in routes_data:
                employee = route_info['employee']
                appointments = route_info['appointments']
                
                # Skip if no appointments
                if not appointments:
                    continue

                # Create sheet name (max 31 characters for Excel)
                sheet_name = f"{employee.first_name}_{employee.last_name}"[:31]
                
                # Prepare data for this route
                route_data = []
                for appointment in appointments:
                    patient = appointment.patient
                    route_data.append({
                        'Zeit': appointment.time.strftime('%H:%M') if appointment.time else '-',
                        'Patient': f"{patient.first_name} {patient.last_name}",
                        'Adresse': f"{patient.street}, {patient.zip_code} {patient.city}",
                        'Besuchsart': appointment.visit_type,
                        'Dauer (Min)': appointment.duration,
                        'Telefon': patient.phone1 or '-'
                    })

                # Convert to DataFrame and write to Excel
                if route_data:
                    df = pd.DataFrame(route_data)
                    df.to_excel(writer, sheet_name=sheet_name, index=False)

                    # Auto-adjust columns width
                    worksheet = writer.sheets[sheet_name]
                    for idx, col in enumerate(df.columns):
                        max_length = max(
                            df[col].astype(str).apply(len).max(),
                            len(col)
                        )
                        worksheet.column_dimensions[chr(65 + idx)].width = max_length + 2

        # Reset pointer and return
        output.seek(0)
        return output 