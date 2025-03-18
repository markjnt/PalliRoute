from typing import List, Dict, Any
import pandas as pd
import re  # Modul für reguläre Ausdrücke hinzugefügt
from datetime import datetime, time
from io import BytesIO
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route
from .. import db

class ExcelService:
    @staticmethod
    def import_employees(file) -> Dict[str, List[Any]]:
        """
        Import employees from Excel file
        Expected columns: Vorname, Nachname, Strasse, PLZ, Ort, Funktion, Stellenumfang, Tournummer (optional)
        """
        try:
            df = pd.read_excel(file)
            required_columns = ['Vorname', 'Nachname', 'Strasse', 'PLZ', 'Ort', 'Funktion', 'Stellenumfang']
            
            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Missing required columns: {', '.join(missing)}")

            employees = []
            skipped_employees = []
            for _, row in df.iterrows():
                try:
                    # Check if employee already exists
                    existing_employee = Employee.query.filter_by(
                        first_name=str(row['Vorname']).strip(),
                        last_name=str(row['Nachname']).strip()
                    ).first()
                    
                    if existing_employee:
                        skipped_employees.append(f"{row['Vorname']} {row['Nachname']}")
                        continue

                    # Convert Stellenumfang to float and handle percentage format
                    stellenumfang = str(row['Stellenumfang']).replace('%', '')
                    work_hours = float(stellenumfang)
                    
                    # Validate work_hours range
                    if work_hours < 0 or work_hours > 100:
                        raise ValueError(f"Stellenumfang muss zwischen 0 und 100 sein, ist aber {work_hours}")

                    # Get tour number if exists
                    tour_number = None
                    if 'Tournummer' in df.columns and pd.notna(row['Tournummer']):
                        # Check if the value is a non-empty string or number
                        if str(row['Tournummer']).strip() != '':
                            try:
                                tour_number = int(row['Tournummer'])
                                # Check if tour_number already exists
                                existing_tour = Employee.query.filter_by(tour_number=tour_number).first()
                                if existing_tour:
                                    raise ValueError(f"Ein Mitarbeiter mit der Tournummer {tour_number} existiert bereits")
                            except ValueError as ve:
                                if "existiert bereits" in str(ve):
                                    raise ve
                                raise ValueError(f"Tournummer muss eine Ganzzahl sein, ist aber {row['Tournummer']}")

                    employee = Employee(
                        first_name=str(row['Vorname']).strip(),
                        last_name=str(row['Nachname']).strip(),
                        street=str(row['Strasse']).strip(),
                        zip_code=str(row['PLZ']).strip(),
                        city=str(row['Ort']).strip(),
                        function=str(row['Funktion']).strip(),
                        work_hours=work_hours,
                        tour_number=tour_number,
                        is_active=True
                    )
                    
                    # Validate function
                    valid_functions = ['PDL', 'Pflegekraft', 'Arzt', 'Honorararzt', 'Physiotherapie']
                    if employee.function not in valid_functions:
                        raise ValueError(f"Ungültige Funktion '{employee.function}'. Muss einer der folgenden Werte sein: {', '.join(valid_functions)}")
                    
                    employees.append(employee)
                    
                except Exception as row_error:
                    raise ValueError(f"Fehler in Zeile {_ + 2}: {str(row_error)}")

            # Add all employees to database
            for employee in employees:
                db.session.add(employee)
            db.session.commit()

            return {
                'imported': employees,
                'skipped': skipped_employees
            }

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error importing employees: {str(e)}")

    @staticmethod
    def import_patients(file) -> Dict[str, List[Any]]:
        """
        Import patients and their appointments from Excel file
        Expected columns: Gebiet, Touren, Nachname, Vorname, Ort, PLZ, Strasse, KW,
                          Montag, Uhrzeit/Info Montag, Dienstag, Uhrzeit/Info Dienstag, etc.
        Returns a dictionary with 'patients' and 'appointments' lists
        
        Importablauf:
        1. Alle Patienten importieren
        2. Mitarbeiter für Mitarbeiter (Tour für Tour) durchgehen
        3. Für jeden Mitarbeiter alle zugehörigen Patienten finden
        4. Für jeden Patienten alle 5 Wochentage durchgehen und Termine erstellen
        """
        try:
            # Step 1: Load the Excel file and validate columns
            print("Step 1: Loading Excel file and validating columns...")
            df = pd.read_excel(file)
            required_columns = [
                'Gebiet', 'Touren', 'Nachname', 'Vorname', 'Ort', 'PLZ', 'Strasse', 'KW',
                'Montag', 'Uhrzeit/Info Montag', 'Dienstag', 'Uhrzeit/Info Dienstag', 
                'Mittwoch', 'Uhrzeit/Info Mittwoch', 'Donnerstag', 'Uhrzeit/Info Donnerstag',
                'Freitag', 'Uhrzeit/Info Freitag', 'Telefon', 'Telefon2'
            ]

            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Missing required columns: {', '.join(missing)}")

            # Step 2: Create and save all patients from the Excel file
            print("Step 2: Creating patient records...")
            patients = []
            for _, row in df.iterrows():
                # Extract tour number from "Tour X Name" format to integer
                tour_number = None
                if pd.notna(row['Touren']):
                    tour_text = str(row['Touren']).strip()
                    # Super einfache Methode: Extrahiert die erste Zahl aus dem String
                    try:
                        # Extrahiere alle Zahlen aus dem String und nimm die erste
                        numbers = re.findall(r'\d+', tour_text)
                        if numbers:
                            tour_number = int(numbers[0])  # Nimm die erste gefundene Zahl
                            print(f"  Extracted tour number {tour_number} from '{tour_text}'")
                        else:
                            print(f"  Warning: No numeric values found in '{tour_text}'")
                    except Exception as e:
                        print(f"  Warning: Error extracting tour number: {str(e)}")
                
                # Create patient with integer tour_number
                patient = Patient(
                    first_name=str(row['Vorname']),
                    last_name=str(row['Nachname']),
                    street=str(row['Strasse']),
                    zip_code=str(row['PLZ']),
                    city=str(row['Ort']),
                    phone1=str(row['Telefon']) if pd.notna(row['Telefon']) else None,
                    phone2=str(row['Telefon2']) if pd.notna(row['Telefon2']) else None,
                    calendar_week=int(row['KW']) if pd.notna(row['KW']) else None,
                    area=str(row['Gebiet']) if pd.notna(row['Gebiet']) else None,
                    tour=tour_number  # Using the extracted integer tour number as 'tour', not 'tour_number'
                )
                patients.append(patient)
            
            # Save all patients to the database to get IDs
            print(f"Saving {len(patients)} patients to database...")
            db.session.add_all(patients)
            db.session.commit()
            print(f"Saved {len(patients)} patients successfully")
            
            # Prüfe auf Patienten ohne Tour-Zuordnung
            patients_without_tour = [p for p in patients if p.tour is None]
            if patients_without_tour:
                # Fehler ausgeben bei Patienten ohne Tour
                patient_names = [f"{p.last_name}, {p.first_name}" for p in patients_without_tour]
                raise ValueError(f"Fehler: Folgende Patienten haben keine Tour-Zuordnung: {', '.join(patient_names[:5])}" + 
                                (f" und {len(patient_names) - 5} weitere" if len(patient_names) > 5 else ""))
            
            # Step 3: Load all employees with tour numbers
            print("Step 3: Loading employees with tour numbers...")
            employees_with_tours = Employee.query.filter_by(is_active=True).filter(Employee.tour_number.isnot(None)).all()
            print(f"Found {len(employees_with_tours)} employees with tour numbers")
            
            # Group patients by tour number for easy lookup
            patients_by_tour = {}
            for patient in patients:
                if patient.tour is not None:
                    if patient.tour not in patients_by_tour:
                        patients_by_tour[patient.tour] = []
                    patients_by_tour[patient.tour].append(patient)
                    
            print(f"Grouped patients by {len(patients_by_tour)} different tour numbers")
            
            # Step 4: Create appointments by processing each employee (tour)
            print("Step 4: Creating appointments tour by tour...")
            appointments = []
            weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
            
            # Gehe Tour für Tour (Mitarbeiter für Mitarbeiter) durch
            for employee in employees_with_tours:
                tour_number = employee.tour_number
                print(f"\nProcessing Tour {tour_number} for employee: {employee.first_name} {employee.last_name} (ID: {employee.id})")
                
                # Finde alle Patienten für diese Tour (anhand der tour-Nummer aus dem Patient-Modell)
                tour_patients = patients_by_tour.get(tour_number, [])
                
                if not tour_patients:
                    print(f"  Warning: No patients found for tour {tour_number}")
                    continue
                
                print(f"  Processing {len(tour_patients)} patients for employee {employee.first_name} {employee.last_name}")
                
                # Verarbeite jeden Patienten dieser Tour
                for patient in tour_patients:
                    patient_key = f"{patient.last_name}_{patient.first_name}_{patient.street}"
                    
                    # Finde die entsprechende Zeile in der Excel-Datei für diesen Patienten
                    excel_rows = df[(df['Nachname'] == patient.last_name) & 
                                 (df['Vorname'] == patient.first_name) & 
                                 (df['Strasse'] == patient.street)]
                    
                    if excel_rows.empty:
                        print(f"  Warning: Could not find Excel data for patient {patient.first_name} {patient.last_name}")
                        continue
                    
                    # Es sollte nur eine passende Zeile geben
                    excel_row = excel_rows.iloc[0]
                    
                    print(f"  Creating appointments for patient {patient.first_name} {patient.last_name} (ID: {patient.id})")
                    patient_appointments = []
                    
                    # Gehe alle 5 Wochentage für diesen Patienten durch
                    for weekday in weekdays:
                        weekday_value = excel_row[weekday]
                        
                        # Überspringe den Tag, wenn kein Wert vorhanden
                        if pd.isna(weekday_value) or str(weekday_value).strip() == "":
                            continue
                        
                        # Konvertiere den Wert in einen String und verarbeite ihn
                        visit_info = str(weekday_value).strip().upper()
                        if not visit_info:
                            print(f"    Skipping {weekday} - no visit type specified")
                            continue
                        
                        # Hole die Zeit/Info für diesen Tag
                        time_info_column = f"Uhrzeit/Info {weekday}"
                        time_info = None
                        if time_info_column in excel_row and not pd.isna(excel_row[time_info_column]):
                            time_info = str(excel_row[time_info_column])
                        
                        # Besuchstyp bestimmen
                        if "HB" in visit_info:
                            visit_type = "HB"
                            duration = 25  # Minuten
                        elif "NA" in visit_info:
                            visit_type = "NA"
                            duration = 120  # Minuten
                        elif "TK" in visit_info:
                            visit_type = "TK"
                            duration = 0  # Minuten (nur Telefonat)
                        else:
                            # Standard: HB wenn nicht anders angegeben
                            visit_type = "HB"
                            duration = 25  # Minuten
                        
                        # Zeitinfo parsen, wenn vorhanden
                        appointment_time = None
                        if time_info and ':' in time_info:
                            try:
                                time_parts = time_info.split(':')
                                hour, minute = int(time_parts[0]), int(time_parts[1])
                                appointment_time = time(hour, minute)
                            except (ValueError, IndexError):
                                # Falls Parsing fehlschlägt, Zeit auf None lassen
                                pass
                        
                        # Deutsche Wochentagsnamen in englische umwandeln (lowercase)
                        weekday_map = {
                            'Montag': 'monday',
                            'Dienstag': 'tuesday',
                            'Mittwoch': 'wednesday',
                            'Donnerstag': 'thursday',
                            'Freitag': 'friday'
                        }
                        english_weekday = weekday_map.get(weekday, weekday.lower())
                        
                        # Termin erstellen mit englischem Wochentag
                        appointment = Appointment(
                            patient_id=patient.id,
                            employee_id=employee.id,
                            weekday=english_weekday,
                            time=appointment_time,
                            visit_type=visit_type,
                            duration=duration,
                            info=time_info
                        )
                        patient_appointments.append(appointment)
                        appointments.append(appointment)
                        print(f"    Added {visit_type} appointment on {weekday} ({english_weekday}) for patient at {appointment_time or 'unspecified time'}")
                    
                    print(f"  Created {len(patient_appointments)} appointments for patient {patient.first_name} {patient.last_name}")
            
            # Step 5: Save all appointments to the database
            print(f"\nStep 5: Saving {len(appointments)} appointments to database...")
            db.session.add_all(appointments)
            db.session.commit()
            
            # Return the results with summary
            calendar_week = patients[0].calendar_week if patients else None
            print(f"\nImport complete: {len(patients)} patients, {len(appointments)} appointments for calendar week {calendar_week}")
            
            # Terminate with some statistics
            appointment_by_day = {}
            for app in appointments:
                if app.weekday not in appointment_by_day:
                    appointment_by_day[app.weekday] = 0
                appointment_by_day[app.weekday] += 1
                
            print("Appointment distribution by day:")
            for day, count in appointment_by_day.items():
                print(f"  {day.capitalize()}: {count} appointments")
            
            return {
                'patients': patients,
                'appointments': appointments
            }

        except Exception as e:
            db.session.rollback()
            error_message = f"Error importing patients: {str(e)}"
            print(error_message)
            raise Exception(error_message) 