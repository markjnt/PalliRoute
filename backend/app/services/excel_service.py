from typing import List, Dict, Any
import pandas as pd
from datetime import datetime, time
from io import BytesIO
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route

class ExcelService:
    @staticmethod
    def import_employees(file) -> List[Employee]:
        """
        Import employees from Excel file
        Expected columns: Vorname, Nachname, Straße, PLZ, Ort, Funktion, Stellenumfang
        """
        try:
            df = pd.read_excel(file)
            required_columns = ['Vorname', 'Nachname', 'Straße', 'PLZ', 'Ort', 'Funktion', 'Stellenumfang']
            
            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Missing required columns: {', '.join(missing)}")

            employees = []
            for _, row in df.iterrows():
                employee = Employee(
                    first_name=row['Vorname'],
                    last_name=row['Nachname'],
                    street=row['Straße'],
                    zip_code=str(row['PLZ']),
                    city=row['Ort'],
                    function=row['Funktion'],
                    work_hours=float(row['Stellenumfang'])
                )
                employees.append(employee)

            return employees

        except Exception as e:
            raise Exception(f"Error importing employees: {str(e)}")

    @staticmethod
    def import_patients(file) -> Dict[str, List[Any]]:
        """
        Import patients and their appointments from Excel file
        Returns a dictionary with 'patients' and 'appointments' lists
        """
        try:
            df = pd.read_excel(file)
            required_columns = [
                'Vorname', 'Nachname', 'Straße', 'PLZ', 'Ort', 
                'Telefon', 'Telefon2', 'KW',
                'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'
            ]

            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Missing required columns: {', '.join(missing)}")

            patients = []
            appointments = []
            weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

            for _, row in df.iterrows():
                # Create patient
                patient = Patient(
                    first_name=row['Vorname'],
                    last_name=row['Nachname'],
                    street=row['Straße'],
                    zip_code=str(row['PLZ']),
                    city=row['Ort'],
                    phone1=str(row['Telefon']) if pd.notna(row['Telefon']) else None,
                    phone2=str(row['Telefon2']) if pd.notna(row['Telefon2']) else None,
                    calendar_week=int(row['KW']) if pd.notna(row['KW']) else None
                )
                patients.append(patient)

                # Create appointments for each weekday
                for weekday in weekdays:
                    if pd.notna(row[weekday]):
                        visit_info = str(row[weekday]).strip().upper()
                        
                        # Skip if TK (Telefonkontakt)
                        if visit_info == 'TK':
                            continue

                        # Parse visit type and time
                        visit_type = 'HB' if visit_info.startswith('HB') else 'NA'
                        duration = 25 if visit_type == 'HB' else 120  # minutes

                        # Try to parse time if provided
                        appointment_time = None
                        if ':' in visit_info:
                            try:
                                time_str = visit_info.split()[-1]
                                hour, minute = map(int, time_str.split(':'))
                                appointment_time = time(hour, minute)
                            except ValueError:
                                pass

                        appointment = Appointment(
                            patient_id=patient.id,  # Will be set after patient is added to DB
                            weekday=weekday.lower(),
                            time=appointment_time,
                            visit_type=visit_type,
                            duration=duration
                        )
                        appointments.append(appointment)

            return {
                'patients': patients,
                'appointments': appointments
            }

        except Exception as e:
            raise Exception(f"Error importing patients: {str(e)}") 