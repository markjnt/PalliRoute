from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import re  # Modul für reguläre Ausdrücke hinzugefügt
from datetime import datetime, time
from io import BytesIO
import os
import time as time_module
import googlemaps
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment, VISIT_TYPE_DURATIONS
from ..models.route import Route
from ..models.employee_planning import EmployeePlanning
from ..models.oncall_assignment import OnCallAssignment
from .. import db
import json
from .route_planner import RoutePlanner
from datetime import date

class ExcelImportService:
    # Class-level cache for geocoding to avoid redundant API calls
    _geocode_cache: Dict[str, Tuple[float, float]] = {}
    
    @staticmethod
    def geocode_address(street: str, zip_code: str, city: str) -> Tuple[Optional[float], Optional[float]]:
        """
        Geocode an address using Google Maps Geocoding API with caching
        Returns a tuple of (latitude, longitude) or (None, None) if geocoding fails
        """
        # Format the address
        address = f"{street}, {zip_code} {city}, Germany"
        cache_key = address.lower().strip()
        
        try:
            # Check if address is already in cache
            if cache_key in ExcelImportService._geocode_cache:
                cached_result = ExcelImportService._geocode_cache[cache_key]
                return cached_result
            
            # Get API key from environment variable
            api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
            if not api_key:
                print("Warning: GOOGLE_MAPS_API_KEY environment variable not set. Geocoding will not work.")
                return None, None
            
            # Initialize Google Maps client
            gmaps = googlemaps.Client(key=api_key)
            
            # Call the Google Maps Geocoding API
            geocode_result = gmaps.geocode(address)
            
            # Check if the request was successful and has results
            if geocode_result and len(geocode_result) > 0:
                location = geocode_result[0]['geometry']['location']
                latitude = location['lat']
                longitude = location['lng']
                
                # Store result in cache
                ExcelImportService._geocode_cache[cache_key] = (latitude, longitude)
                
                return latitude, longitude
            else:
                print(f"  Warning: Failed to geocode address: {address}")
                return None, None
                
        except Exception as e:
            print(f"  Error geocoding address: {e}")
            return None, None

    @staticmethod
    def batch_geocode_addresses(address_tuples, max_workers=10):
        """
        Geocode multiple addresses in parallel using ThreadPoolExecutor.
        address_tuples: List of (street, zip_code, city)
        Returns: Dict with (street, zip_code, city) as key and (lat, lng) as value
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        results = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_address = {
                executor.submit(ExcelImportService.geocode_address, street, zip_code, city): (street, zip_code, city)
                for (street, zip_code, city) in address_tuples
            }
            for future in as_completed(future_to_address):
                address = future_to_address[future]
                try:
                    latlng = future.result()
                    results[address] = latlng
                except Exception as exc:
                    print(f"  Error in geocoding for {address}: {exc}")
                    results[address] = (None, None)
        return results
    
    @staticmethod
    def delete_patient_data():
        """
        Deletes only patient-related data, keeps employees and their planning
        """
        try:
            # Delete in correct order to maintain referential integrity
            Route.query.delete()
            Appointment.query.delete()
            Patient.query.delete()
            # Note: Employees and EmployeePlanning are NOT deleted
            db.session.commit()
            print("Successfully deleted patient data from database")
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error deleting patient data: {str(e)}")

    @staticmethod
    def delete_planning_for_employee(employee_id):
        """
        Delete all planning entries for a specific employee
        """
        try:
            # Delete all planning entries for this employee
            deleted_count = EmployeePlanning.query.filter_by(employee_id=employee_id).delete()
            print(f"Successfully deleted {deleted_count} planning entries for employee ID {employee_id}")
            
        except Exception as e:
            raise Exception(f"Error deleting planning for employee {employee_id}: {str(e)}")

    @staticmethod
    def _create_planning_entries_for_employees(employees):
        """
        Create planning entries for all employees for all weeks and weekdays
        """
        try:
            # Define weekdays
            weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            
            # Create planning entries for all 52 weeks of the year
            planning_entries = []
            
            for employee in employees:
                for calendar_week in range(1, 53):  # Weeks 1-52
                    for weekday in weekdays:
                        # Check if entry already exists
                        existing = EmployeePlanning.query.filter_by(
                            employee_id=employee.id,
                            weekday=weekday,
                            calendar_week=calendar_week
                        ).first()
                        
                        if not existing:
                            planning_entry = EmployeePlanning(
                                employee_id=employee.id,
                                weekday=weekday,
                                available=True,
                                calendar_week=calendar_week
                            )
                            planning_entries.append(planning_entry)
            
            # Bulk insert all planning entries
            if planning_entries:
                db.session.add_all(planning_entries)
                db.session.commit()
                print(f"Successfully created {len(planning_entries)} planning entries for {len(employees)} employees")
            else:
                print("No new planning entries needed - all entries already exist")
                
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error creating planning entries: {str(e)}")

    @staticmethod
    def import_employees(file_path) -> Dict[str, List[Any]]:
        """
        Import employees from Excel file with dynamic planning management
        Expected columns: Vorname, Nachname, Strasse, PLZ, Ort, Funktion, Stellenumfang, Gebiet, Alias
        Optional columns: Rufbereitschaft Pflege unter der Woche, Rufbereitschaft Pflege Wochenende Tag,
                         Rufbereitschaft Pflege Wochenende Nacht, Rufbereitschaft Ärzte unter der Woche,
                         Rufbereitschaft Ärzte Wochenende, Wochenenddienste Pflege
        
        Note: This import also deletes all patient, appointment and route data
        """
        try:
            # Step 1: Delete existing patient data (patients, appointments, routes)
            print("Step 1: Deleting existing patient data...")
            ExcelImportService.delete_patient_data()
            
            df = pd.read_excel(file_path)
            required_columns = ['Vorname', 'Nachname', 'Strasse', 'PLZ', 'Ort', 'Funktion', 'Stellenumfang', 'Gebiet']
            
            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Fehlende Spalten: {', '.join(missing)}")

            valid_areas = ['Nordkreis', 'Südkreis']
            valid_functions = ['PDL', 'Pflegekraft', 'Arzt', 'Honorararzt', 'Physiotherapie']
            
            # Get existing employees from database
            existing_employees = Employee.query.all()
            existing_employee_keys = set()
            for emp in existing_employees:
                key = f"{emp.first_name.strip().lower()}_{emp.last_name.strip().lower()}"
                existing_employee_keys.add(key)
            
            print(f"Found {len(existing_employees)} existing employees in database")
            
            # 1. Adressen extrahieren und deduplizieren
            address_tuples = []
            for _, row in df.iterrows():
                street = str(row['Strasse']).strip()
                zip_code = str(row['PLZ']).strip()
                city = str(row['Ort']).strip()
                address_tuples.append((street, zip_code, city))
            unique_address_tuples = list(set(address_tuples))

            # 2. Batch-Geocoding
            geocode_results = ExcelImportService.batch_geocode_addresses(unique_address_tuples, max_workers=10)

            # 3. Process employees from Excel
            added_employees = []
            updated_employees = []
            excel_employee_keys = set()
            
            for idx, row in df.iterrows():
                try:
                    stellenumfang = str(row['Stellenumfang']).replace('%', '')
                    work_hours = float(stellenumfang)
                    if work_hours < 0 or work_hours > 100:
                        raise ValueError(f"Stellenumfang muss zwischen 0 und 100 sein, ist aber {work_hours}")

                    area = str(row['Gebiet']).strip()
                    if area not in valid_areas:
                        raise ValueError(f"Ungültiges Gebiet '{area}'. Muss einer der folgenden Werte sein: {', '.join(valid_areas)}")

                    street = str(row['Strasse']).strip()
                    zip_code = str(row['PLZ']).strip()
                    city = str(row['Ort']).strip()
                    latitude, longitude = geocode_results.get((street, zip_code, city), (None, None))

                    function = str(row['Funktion']).strip()
                    if function not in valid_functions:
                        raise ValueError(f"Ungültige Funktion '{function}'. Muss einer der folgenden Werte sein: {', '.join(valid_functions)}")

                    # Handle alias field (optional) - support both "Alias" and "Aliasse" column names
                    alias = None
                    if 'Alias' in df.columns and pd.notna(row['Alias']):
                        alias = str(row['Alias']).strip()
                    elif 'Aliasse' in df.columns and pd.notna(row['Aliasse']):
                        alias = str(row['Aliasse']).strip()

                    # Handle Rufbereitschaft fields (optional, integer values)
                    oncall_nursing_weekday = None
                    if 'Rufbereitschaft Pflege unter der Woche' in df.columns and pd.notna(row['Rufbereitschaft Pflege unter der Woche']):
                        try:
                            oncall_nursing_weekday = int(float(row['Rufbereitschaft Pflege unter der Woche']))
                        except (ValueError, TypeError):
                            raise ValueError(f"Ungültiger Wert für 'Rufbereitschaft Pflege unter der Woche' in Zeile {idx + 2}. Erwartet: Zahl")
                    
                    oncall_nursing_weekend_day = None
                    if 'Rufbereitschaft Pflege Wochenende Tag' in df.columns and pd.notna(row['Rufbereitschaft Pflege Wochenende Tag']):
                        try:
                            oncall_nursing_weekend_day = int(float(row['Rufbereitschaft Pflege Wochenende Tag']))
                        except (ValueError, TypeError):
                            raise ValueError(f"Ungültiger Wert für 'Rufbereitschaft Pflege Wochenende Tag' in Zeile {idx + 2}. Erwartet: Zahl")
                    
                    oncall_nursing_weekend_night = None
                    if 'Rufbereitschaft Pflege Wochenende Nacht' in df.columns and pd.notna(row['Rufbereitschaft Pflege Wochenende Nacht']):
                        try:
                            oncall_nursing_weekend_night = int(float(row['Rufbereitschaft Pflege Wochenende Nacht']))
                        except (ValueError, TypeError):
                            raise ValueError(f"Ungültiger Wert für 'Rufbereitschaft Pflege Wochenende Nacht' in Zeile {idx + 2}. Erwartet: Zahl")
                    
                    oncall_doctors_weekday = None
                    if 'Rufbereitschaft Ärzte unter der Woche' in df.columns and pd.notna(row['Rufbereitschaft Ärzte unter der Woche']):
                        try:
                            oncall_doctors_weekday = int(float(row['Rufbereitschaft Ärzte unter der Woche']))
                        except (ValueError, TypeError):
                            raise ValueError(f"Ungültiger Wert für 'Rufbereitschaft Ärzte unter der Woche' in Zeile {idx + 2}. Erwartet: Zahl")
                    
                    oncall_doctors_weekend = None
                    if 'Rufbereitschaft Ärzte Wochenende' in df.columns and pd.notna(row['Rufbereitschaft Ärzte Wochenende']):
                        try:
                            oncall_doctors_weekend = int(float(row['Rufbereitschaft Ärzte Wochenende']))
                        except (ValueError, TypeError):
                            raise ValueError(f"Ungültiger Wert für 'Rufbereitschaft Ärzte Wochenende' in Zeile {idx + 2}. Erwartet: Zahl")
                    
                    weekend_services_nursing = None
                    if 'Wochenenddienste Pflege' in df.columns and pd.notna(row['Wochenenddienste Pflege']):
                        try:
                            weekend_services_nursing = int(float(row['Wochenenddienste Pflege']))
                        except (ValueError, TypeError):
                            raise ValueError(f"Ungültiger Wert für 'Wochenenddienste Pflege' in Zeile {idx + 2}. Erwartet: Zahl")

                    first_name = str(row['Vorname']).strip()
                    last_name = str(row['Nachname']).strip()
                    employee_key = f"{first_name.lower()}_{last_name.lower()}"
                    excel_employee_keys.add(employee_key)
                    
                    # Check if employee already exists
                    existing_employee = None
                    for emp in existing_employees:
                        if (emp.first_name.strip().lower() == first_name.lower() and 
                            emp.last_name.strip().lower() == last_name.lower()):
                            existing_employee = emp
                            break
                    
                    if existing_employee:
                        # Update existing employee
                        existing_employee.street = street
                        existing_employee.zip_code = zip_code
                        existing_employee.city = city
                        existing_employee.latitude = latitude
                        existing_employee.longitude = longitude
                        existing_employee.function = function
                        existing_employee.work_hours = work_hours
                        existing_employee.area = area
                        existing_employee.alias = alias
                        existing_employee.oncall_nursing_weekday = oncall_nursing_weekday
                        existing_employee.oncall_nursing_weekend_day = oncall_nursing_weekend_day
                        existing_employee.oncall_nursing_weekend_night = oncall_nursing_weekend_night
                        existing_employee.oncall_doctors_weekday = oncall_doctors_weekday
                        existing_employee.oncall_doctors_weekend = oncall_doctors_weekend
                        existing_employee.weekend_services_nursing = weekend_services_nursing
                        updated_employees.append(existing_employee)
                        print(f"Updated employee: {first_name} {last_name}")
                    else:
                        # Create new employee
                        employee = Employee(
                            first_name=first_name,
                            last_name=last_name,
                            street=street,
                            zip_code=zip_code,
                            city=city,
                            latitude=latitude,
                            longitude=longitude,
                            function=function,
                            work_hours=work_hours,
                            area=area,
                            alias=alias,
                            oncall_nursing_weekday=oncall_nursing_weekday,
                            oncall_nursing_weekend_day=oncall_nursing_weekend_day,
                            oncall_nursing_weekend_night=oncall_nursing_weekend_night,
                            oncall_doctors_weekday=oncall_doctors_weekday,
                            oncall_doctors_weekend=oncall_doctors_weekend,
                            weekend_services_nursing=weekend_services_nursing
                        )
                        added_employees.append(employee)
                        db.session.add(employee)
                        print(f"Added new employee: {first_name} {last_name}")
                        
                except Exception as row_error:
                    raise ValueError(f"Fehler in Zeile {idx + 2}: {str(row_error)}")

            # 4. Remove employees that are not in Excel
            removed_employees = []
            for emp in existing_employees:
                emp_key = f"{emp.first_name.strip().lower()}_{emp.last_name.strip().lower()}"
                if emp_key not in excel_employee_keys:
                    removed_employees.append(emp)
                    print(f"Removing employee: {emp.first_name} {emp.last_name}")
            
            # Delete planning entries and employees that are not in Excel
            for emp in removed_employees:
                ExcelImportService.delete_planning_for_employee(emp.id)
                db.session.delete(emp)
            
            db.session.commit()
            
            # 5. Create planning entries for new employees only
            if added_employees:
                print(f"Creating planning entries for {len(added_employees)} new employees...")
                ExcelImportService._create_planning_entries_for_employees(added_employees)
            
            print(f"Import complete: {len(added_employees)} added, {len(updated_employees)} updated, {len(removed_employees)} removed")
            
            return {
                'added': added_employees,
                'updated': updated_employees,
                'removed': removed_employees
            }

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Fehler beim Importieren der Mitarbeiter: {str(e)}")

    @staticmethod
    def _process_single_sheet(df: pd.DataFrame, sheet_name: str, employees: List[Employee]) -> Dict[str, List[Any]]:
        """
        Process a single sheet: create patients, appointments, and routes for that sheet
        """
        required_columns = [
            'Gebiet', 'Touren', 'Nachname', 'Vorname', 'Ort', 'PLZ', 'Strasse', 'KW',
            'Montag', 'Uhrzeit/Info Montag', 'Dienstag', 'Uhrzeit/Info Dienstag', 
            'Mittwoch', 'Uhrzeit/Info Mittwoch', 'Donnerstag', 'Uhrzeit/Info Donnerstag',
            'Freitag', 'Uhrzeit/Info Freitag', 'Telefon', 'Telefon2'
        ]
        
        # Validate columns for this sheet
        if not all(col in df.columns for col in required_columns):
            missing = [col for col in required_columns if col not in df.columns]
            raise ValueError(f"Missing columns in sheet {sheet_name}: {', '.join(missing)}")
        
        # Load replacement information for this sheet
        print(f"  Loading replacement information for sheet {sheet_name}...")
        replacement_assignments = {}
        for emp in employees:
            planning_entries = EmployeePlanning.query.filter_by(employee_id=emp.id).all()
            for entry in planning_entries:
                if entry.replacement_id:
                    key = (entry.weekday, entry.calendar_week)
                    if key not in replacement_assignments:
                        replacement_assignments[key] = {}
                    replacement_assignments[key][emp.id] = entry.replacement_id
                    print(f"    Found replacement: {emp.first_name} {emp.last_name} -> {entry.replacement.first_name} {entry.replacement.last_name} on {entry.weekday} (KW {entry.calendar_week})")
        
        # 1. Create patients for this sheet
        print(f"  Step 1: Creating patients from sheet {sheet_name}...")
        patients = ExcelImportService._create_patients_from_sheet(df, sheet_name)
        
        # 2. Create appointments for this sheet's patients
        print(f"  Step 2: Creating appointments for sheet {sheet_name}...")
        appointments = ExcelImportService._create_appointments_from_sheet(df, patients, employees, sheet_name, replacement_assignments)
        
        # 3. Create routes for this sheet's appointments
        print(f"  Step 3: Creating routes for sheet {sheet_name}...")
        routes = ExcelImportService._create_routes_from_sheet(appointments, employees)
        
        return {
            'patients': patients,
            'appointments': appointments,
            'routes': routes
        }

    @staticmethod
    def _create_patients_from_sheet(df: pd.DataFrame, sheet_name: str) -> List[Patient]:
        """
        Create patients from a single sheet
        """
        # Extract and deduplicate patient addresses for geocoding
        patient_address_tuples = []
        for _, row in df.iterrows():
            street = str(row['Strasse']).strip()
            zip_code = str(row['PLZ']).strip()
            city = str(row['Ort']).strip()
            patient_address_tuples.append((street, zip_code, city))
        unique_patient_address_tuples = list(set(patient_address_tuples))
        
        # Batch geocoding for this sheet
        geocode_results = ExcelImportService.batch_geocode_addresses(unique_patient_address_tuples, max_workers=10)
        
        # Create patients
        patients = []
        for idx, row in df.iterrows():
            # Validate required fields
            first_name = str(row['Vorname']).strip()
            last_name = str(row['Nachname']).strip()
            street = str(row['Strasse']).strip()
            zip_code = str(row['PLZ']).strip()
            city = str(row['Ort']).strip()
            
            # Check required fields are not empty
            if not first_name:
                raise ValueError(f"Vorname ist leer in Zeile {idx + 2}")
            if not last_name:
                raise ValueError(f"Nachname ist leer in Zeile {idx + 2}")
            if not street:
                raise ValueError(f"Strasse ist leer für Patient {first_name} {last_name} in Zeile {idx + 2}")
            if not zip_code:
                raise ValueError(f"PLZ ist leer für Patient {first_name} {last_name} in Zeile {idx + 2}")
            if not city:
                raise ValueError(f"Ort ist leer für Patient {first_name} {last_name} in Zeile {idx + 2}")
            
            # Validate PLZ format (German postal codes: 5 digits)
            if not zip_code.isdigit() or len(zip_code) != 5:
                raise ValueError(f"Ungültige PLZ '{zip_code}' für Patient {first_name} {last_name} in Zeile {idx + 2}. PLZ muss 5 Ziffern haben")
            
            latitude, longitude = geocode_results.get((street, zip_code, city), (None, None))
            
            # Process area field with substring matching
            area_raw = str(row['Gebiet']).strip() if pd.notna(row['Gebiet']) else ""
            
            # Check if area field is empty
            if not area_raw:
                raise ValueError(f"Gebiet-Spalte ist leer für Patient {first_name} {last_name} in Zeile {idx + 2}")
            
            # Determine area based on substring matching
            area_raw_lower = area_raw.lower()
            if "nordkreis" in area_raw_lower:
                patient_area = "Nordkreis"
            elif "südkreis" in area_raw_lower or "suedkreis" in area_raw_lower:
                patient_area = "Südkreis"
            else:
                raise ValueError(f"Ungültiges Gebiet '{area_raw}' für Patient {first_name} {last_name} in Zeile {idx + 2}. Erwartet: 'Nordkreis' oder 'Südkreis'")
            
            # Validate calendar week (KW)
            calendar_week = None
            if pd.notna(row['KW']):
                try:
                    calendar_week = int(row['KW'])
                    if calendar_week < 1 or calendar_week > 53:
                        raise ValueError(f"Ungültige Kalenderwoche {calendar_week} für Patient {first_name} {last_name} in Zeile {idx + 2}. Muss zwischen 1 und 53 sein")
                except (ValueError, TypeError):
                    raise ValueError(f"Ungültige Kalenderwoche '{row['KW']}' für Patient {first_name} {last_name} in Zeile {idx + 2}. Muss eine Zahl zwischen 1 und 53 sein")
            
            patient = Patient(
                first_name=first_name,
                last_name=last_name,
                street=street,
                zip_code=zip_code,
                city=city,
                latitude=latitude,
                longitude=longitude,
                phone1=str(row['Telefon']) if pd.notna(row['Telefon']) else None,
                phone2=str(row['Telefon2']) if pd.notna(row['Telefon2']) else None,
                calendar_week=calendar_week,
                area=patient_area
            )
            patients.append(patient)
        
        # Save patients to get IDs
        print(f"    Saving {len(patients)} patients from sheet {sheet_name}...")
        db.session.add_all(patients)
        db.session.commit()
        print(f"    Saved {len(patients)} patients successfully")
        
        return patients

    @staticmethod
    def _create_appointments_from_sheet(df: pd.DataFrame, patients: List[Patient], employees: List[Employee], sheet_name: str, replacement_assignments: Dict) -> List[Appointment]:
        """
        Create appointments for patients from a single sheet
        """
        appointments = []
        weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
        
        # Check which weekend columns are available
        available_weekend_days = []
        for day in ['Samstag', 'Sonntag']:
            if day in df.columns:
                available_weekend_days.append(day)
        
        weekend_days = available_weekend_days
        if weekend_days:
            print(f"    Found weekend columns: {weekend_days}")
        
        # Check for responsible employee columns
        responsible_columns = [f"Zuständige {weekday}" for weekday in weekdays]
        has_responsible_columns = any(col in df.columns for col in responsible_columns)
        
        if has_responsible_columns:
            print(f"    Found responsible employee columns: {[col for col in responsible_columns if col in df.columns]}")
        
        # Check for weekend area column
        weekend_area_column = 'Touren-Wochenende'
        has_weekend_area = weekend_area_column in df.columns
        
        for idx, row in df.iterrows():
            # Find the patient for this row (exact match including calendar_week)
            row_calendar_week = int(row['KW']) if pd.notna(row['KW']) else None
            patient = next((p for p in patients if 
                           p.last_name == str(row['Nachname']).strip() and
                           p.first_name == str(row['Vorname']).strip() and
                           p.street == str(row['Strasse']).strip() and
                           p.calendar_week == row_calendar_week), None)
            if not patient:
                print(f"    Warning: Patient not found for row {idx} in sheet {sheet_name}")
                continue
            
            print(f"    Processing patient {patient.first_name} {patient.last_name} (KW {patient.calendar_week})")
            
            # Default employee assignment from 'Touren' column
            mitarbeiter_nachname_raw = str(row['Touren']).strip() if pd.notna(row['Touren']) else None
            if not mitarbeiter_nachname_raw:
                raise ValueError(f"Touren-Spalte ist leer für Patient {patient.first_name} {patient.last_name} in Zeile {idx + 2}")
            
            # Find matching employees
            matching_employees = [e for e in employees if e.last_name.lower() in mitarbeiter_nachname_raw.lower()]
            if len(matching_employees) == 0:
                available_employees = [e.last_name for e in employees]
                raise ValueError(f"Kein Mitarbeiter gefunden mit Nachname in '{mitarbeiter_nachname_raw}' für Patient {patient.first_name} {patient.last_name} in Zeile {idx + 2}. Verfügbare Mitarbeiter: {', '.join(available_employees)}")
            if len(matching_employees) > 1:
                raise ValueError(f"Mehrere Mitarbeiter passen zu '{mitarbeiter_nachname_raw}' für Patient {patient.first_name} {patient.last_name} in Zeile {idx + 2}: {[e.last_name for e in matching_employees]}. Bitte spezifischer werden.")
            
            default_employee = matching_employees[0]
            print(f"    → Assigned to {default_employee.first_name} {default_employee.last_name}")
            
            # Create weekday appointments
            for weekday in weekdays:
                weekday_value = row[weekday]
                visit_type = None
                duration = 0
                if not pd.isna(weekday_value) and str(weekday_value).strip() != "":
                    visit_info = str(weekday_value).strip().upper()
                    if "HB" in visit_info:
                        visit_type = "HB"
                    elif "NA" in visit_info:
                        visit_type = "NA"
                    elif "TK" in visit_info:
                        visit_type = "TK"
                    else:
                        # Validate that only valid visit types are used
                        valid_visit_types = ["HB", "NA", "TK"]
                        raise ValueError(f"Ungültiger Besuchstyp '{visit_info}' für Patient {patient.first_name} {patient.last_name} am {weekday} in Zeile {idx + 2}. Erlaubte Werte: {', '.join(valid_visit_types)}")
                    duration = VISIT_TYPE_DURATIONS.get(visit_type, 0)
                
                # Parse responsible employees - support multiple aliases separated by comma
                responsible_column = f"Zuständige {weekday}"
                responsible_aliases = []
                
                if has_responsible_columns and responsible_column in df.columns:
                    responsible_alias_raw = row.get(responsible_column)
                    if pd.notna(responsible_alias_raw) and str(responsible_alias_raw).strip() != "":
                        # Split by comma and strip whitespace from each alias
                        alias_strings = [alias.strip() for alias in str(responsible_alias_raw).split(',')]
                        responsible_aliases = [alias for alias in alias_strings if alias]  # Remove empty strings
                
                # If no responsible aliases found, use default employee (single entry)
                if not responsible_aliases:
                    responsible_aliases = [None]  # None means use default_employee
                
                # Parse time info (shared for all appointments of this weekday)
                time_info_column = f"Uhrzeit/Info {weekday}"
                time_info = None
                if time_info_column in row and not pd.isna(row[time_info_column]):
                    time_info = str(row[time_info_column])
                appointment_time = None
                if time_info and ':' in time_info:
                    try:
                        time_parts = time_info.split(':')
                        hour, minute = int(time_parts[0]), int(time_parts[1])
                        appointment_time = time(hour, minute)
                    except (ValueError, IndexError):
                        pass
                
                # Weekday mapping
                weekday_map = {
                    'Montag': 'monday',
                    'Dienstag': 'tuesday',
                    'Mittwoch': 'wednesday',
                    'Donnerstag': 'thursday',
                    'Freitag': 'friday'
                }
                english_weekday = weekday_map.get(weekday, weekday.lower())
                replacement_key = (english_weekday, patient.calendar_week)
                visit_type_value = visit_type if visit_type is not None else ""
                
                # Create one appointment for each responsible alias (or default if no alias)
                for alias in responsible_aliases:
                    assigned_employee = default_employee
                    has_responsible_assignment = False
                    
                    if alias is not None:
                        # Find employee by alias
                        alias_employee = next((e for e in employees if e.alias and e.alias.strip() == alias), None)
                        if alias_employee:
                            assigned_employee = alias_employee
                            has_responsible_assignment = True
                            print(f"      {weekday}: Assigned to {alias_employee.first_name} {alias_employee.last_name} (alias: {alias})")
                        else:
                            print(f"      Warning: No employee found with alias '{alias}' for {weekday}, using default employee")
                    
                    # Store the original assigned employee (before any replacement logic)
                    original_employee_id = assigned_employee.id
                    
                    # Check for replacement employee (highest priority)
                    if replacement_key in replacement_assignments and assigned_employee.id in replacement_assignments[replacement_key]:
                        replacement_id = replacement_assignments[replacement_key][assigned_employee.id]
                        replacement_employee = next((e for e in employees if e.id == replacement_id), None)
                        if replacement_employee:
                            print(f"      {weekday}: Using replacement employee {replacement_employee.first_name} {replacement_employee.last_name} (replacing {assigned_employee.first_name} {assigned_employee.last_name})")
                            assigned_employee = replacement_employee
                        else:
                            print(f"      Warning: Replacement employee with ID {replacement_id} not found, using original employee")
                    
                    # Set tour_employee_id if there's a responsible employee different from default
                    # Use original_employee_id (before replacement) for comparison
                    tour_employee_id_value = None
                    if has_responsible_assignment and original_employee_id != default_employee.id:
                        # There's a different responsible employee, so store the tour employee
                        tour_employee_id_value = default_employee.id
                    
                    appointment = Appointment(
                        patient_id=patient.id,
                        employee_id=assigned_employee.id,  # Zuständiger Mitarbeiter (oder ursprünglicher)
                        origin_employee_id=original_employee_id,
                        tour_employee_id=tour_employee_id_value,  # Ursprünglicher Mitarbeiter aus "Touren"
                        weekday=english_weekday,
                        time=appointment_time,
                        visit_type=visit_type_value,
                        duration=duration,
                        info=time_info,
                        area=patient.area,
                        calendar_week=patient.calendar_week
                    )
                    appointments.append(appointment)
            
            # Create weekend appointments if available
            if weekend_days:
                for weekday in weekend_days:
                    weekday_value = row[weekday]
                    visit_type = None
                    duration = 0
                    if not pd.isna(weekday_value) and str(weekday_value).strip() != "":
                        visit_info = str(weekday_value).strip().upper()
                        if "HB" in visit_info:
                            visit_type = "HB"
                        elif "NA" in visit_info:
                            visit_type = "NA"
                        elif "TK" in visit_info:
                            visit_type = "TK"
                        else:
                            # Validate that only valid visit types are used
                            valid_visit_types = ["HB", "NA", "TK"]
                            raise ValueError(f"Ungültiger Besuchstyp '{visit_info}' für Patient {patient.first_name} {patient.last_name} am {weekday} in Zeile {idx + 2}. Erlaubte Werte: {', '.join(valid_visit_types)}")
                        duration = VISIT_TYPE_DURATIONS.get(visit_type, 0)
                    
                    # Weekend area assignment
                    weekend_area = None
                    if has_weekend_area and weekend_area_column in row and pd.notna(row[weekend_area_column]):
                        weekend_area_raw = str(row[weekend_area_column]).strip()
                        weekend_area_raw_lower = weekend_area_raw.lower()
                        if "nord" in weekend_area_raw_lower:
                            weekend_area = "Nord"
                        elif "mitte" in weekend_area_raw_lower:
                            weekend_area = "Mitte"
                        elif "süd" in weekend_area_raw_lower or "sued" in weekend_area_raw_lower:
                            weekend_area = "Süd"
                    
                    # Parse time info
                    time_info_column = f"Uhrzeit/Info {weekday}"
                    time_info = None
                    if time_info_column in row and not pd.isna(row[time_info_column]):
                        time_info = str(row[time_info_column])
                    appointment_time = None
                    if time_info and ':' in time_info:
                        try:
                            time_parts = time_info.split(':')
                            hour, minute = int(time_parts[0]), int(time_parts[1])
                            appointment_time = time(hour, minute)
                        except (ValueError, IndexError):
                            pass
                    
                    # Create weekend appointment
                    weekday_map = {
                        'Samstag': 'saturday',
                        'Sonntag': 'sunday'
                    }
                    english_weekday = weekday_map.get(weekday, weekday.lower())
                    visit_type_value = visit_type if visit_type is not None else ""
                    
                    if visit_type is not None:
                        # Wenn Weekend-Termin vorhanden ist, aber keine Touren-Wochenende-Angabe,
                        # wird der Termin ohne Area angelegt (leerer String)
                        if weekend_area is None:
                            weekend_area = "Nicht zugewiesen"
                        appointment = Appointment(
                            patient_id=patient.id,
                            employee_id=None,  # No employee assignment for weekend appointments
                            origin_employee_id=None,  # No original employee for weekend appointments
                            weekday=english_weekday,
                            time=appointment_time,
                            visit_type=visit_type_value,
                            duration=duration,
                            info=time_info,
                            area=weekend_area,
                            calendar_week=patient.calendar_week  # Set calendar_week from patient
                        )
                        appointments.append(appointment)
        
        # Save appointments
        print(f"    Saving {len(appointments)} appointments from sheet {sheet_name}...")
        db.session.add_all(appointments)
        db.session.commit()
        print(f"    Saved {len(appointments)} appointments successfully")
        
        return appointments

    @staticmethod
    def _create_routes_from_sheet(appointments: List[Appointment], employees: List[Employee]) -> List[Route]:
        """
        Create routes for appointments from a single sheet
        """
        routes = []
        
        # Employee area mapping
        employee_id_to_area = {emp.id: emp.area for emp in employees}
        
        # Group appointments by employee and weekday (weekdays only)
        # Use employee_id (zuständiger Mitarbeiter) for route grouping
        employee_weekday_appointments = {}
        for app in appointments:
            if app.visit_type in ('HB', 'NA') and app.employee_id is not None:
                key = (app.employee_id, app.weekday)
                if key not in employee_weekday_appointments:
                    employee_weekday_appointments[key] = []
                employee_weekday_appointments[key].append(app)
        
        # Create routes for each employee-weekday combination
        for (employee_id, weekday), apps in employee_weekday_appointments.items():
            if not apps:
                continue
            
            appointment_ids = [app.id for app in apps]
            route_area = employee_id_to_area.get(employee_id, '')
            # Get calendar_week from first appointment (all appointments in this route should have same calendar_week)
            route_calendar_week = apps[0].calendar_week
            new_route = Route(
                employee_id=employee_id,
                weekday=weekday,
                route_order=json.dumps(appointment_ids),
                total_duration=0,
                total_distance=0,
                area=route_area,
                calendar_week=route_calendar_week
            )
            routes.append(new_route)
        
        # Group weekend appointments by area and weekday
        weekend_area_appointments = {}
        for app in appointments:
            if (
                app.visit_type in ('HB', 'NA')
                and app.employee_id is None
                and app.weekday in ['saturday', 'sunday']
            ):
                # Skip creating routes for unassigned appointments; they get assigned later
                if not app.area or app.area == "Nicht zugewiesen":
                    continue
                key = (app.area, app.weekday)
                if key not in weekend_area_appointments:
                    weekend_area_appointments[key] = []
                weekend_area_appointments[key].append(app)
        
        # Create weekend routes for each area-weekday combination
        for (area, weekday), apps in weekend_area_appointments.items():
            if not apps:
                continue
            
            appointment_ids = [app.id for app in apps]
            # Get calendar_week from first appointment (all appointments in this route should have same calendar_week)
            route_calendar_week = apps[0].calendar_week
            new_route = Route(
                employee_id=None,
                weekday=weekday,
                route_order=json.dumps(appointment_ids),
                total_duration=0,
                total_distance=0,
                area=area,
                calendar_week=route_calendar_week
            )
            routes.append(new_route)
        
        # Save routes
        if routes:
            print(f"    Saving {len(routes)} routes...")
            db.session.add_all(routes)
            db.session.commit()
            print(f"    Saved {len(routes)} routes successfully")
        
        return routes

    @staticmethod
    def _create_empty_routes(employees: List[Employee], calendar_weeks: List[int]) -> List[Route]:
        """
        Create empty routes for all employees for all weekdays for all calendar weeks
        """
        empty_routes = []
        english_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        
        # Create empty routes for each calendar week
        for calendar_week in calendar_weeks:
            print(f"    Creating empty routes for KW {calendar_week}...")
            
            for employee in employees:
                for weekday in english_weekdays:
                    # Check if route already exists for this employee, weekday, and calendar_week
                    existing_route = Route.query.filter_by(
                        employee_id=employee.id,
                        weekday=weekday,
                        calendar_week=calendar_week
                    ).first()
                    
                    if not existing_route:
                        print(f"      Creating empty route for employee {employee.first_name} {employee.last_name} on {weekday} (KW {calendar_week})")
                        new_route = Route(
                            employee_id=employee.id,
                            weekday=weekday,
                            route_order=json.dumps([]),
                            total_duration=0,
                            total_distance=0,
                            area=employee.area or '',
                            calendar_week=calendar_week  # Set specific calendar_week
                        )
                        empty_routes.append(new_route)
            
            # Create empty weekend routes for this calendar week
            weekend_areas = ['Nord', 'Mitte', 'Süd']
            english_weekend_days = ['saturday', 'sunday']
            
            for area in weekend_areas:
                for weekday in english_weekend_days:
                    existing_route = Route.query.filter_by(
                        employee_id=None,
                        weekday=weekday,
                        area=area,
                        calendar_week=calendar_week
                    ).first()
                    
                    if not existing_route:
                        print(f"      Creating empty weekend route for area {area} on {weekday} (KW {calendar_week})")
                        new_route = Route(
                            employee_id=None,
                            weekday=weekday,
                            route_order=json.dumps([]),
                            total_duration=0,
                            total_distance=0,
                            area=area,
                            calendar_week=calendar_week  # Set specific calendar_week
                        )
                        empty_routes.append(new_route)
        
        if empty_routes:
            print(f"    Saving {len(empty_routes)} empty routes...")
            db.session.add_all(empty_routes)
            db.session.commit()
            print(f"    Saved {len(empty_routes)} empty routes successfully")
        
        return empty_routes

    @staticmethod
    def _plan_all_routes(routes: List[Route]):
        """
        Plan all routes using the route planner
        """
        route_planner = RoutePlanner()
        planned_routes = 0
        failed_routes = 0
        
        # Plan ALL routes (including empty ones) for ALL calendar weeks
        weekday_routes = [r for r in routes if r.employee_id is not None]
        for route in weekday_routes:
            try:
                route_status = "with appointments" if route.get_route_order() else "empty"
                print(f"    Planning route for employee {route.employee_id} on {route.weekday} (KW {route.calendar_week}) - {route_status}")
                route_planner.plan_route(route.weekday, route.employee_id, calendar_week=route.calendar_week)
                planned_routes += 1
            except Exception as e:
                print(f"    Failed to plan route for employee {route.employee_id} on {route.weekday} (KW {route.calendar_week}): {str(e)}")
                failed_routes += 1
        
        # Plan weekend routes (without employee_id)
        weekend_routes = [r for r in routes if r.employee_id is None]
        for route in weekend_routes:
            try:
                route_status = "with appointments" if route.get_route_order() else "empty"
                print(f"    Planning weekend route for area {route.area} on {route.weekday} (KW {route.calendar_week}) - {route_status}")
                route_planner.plan_route(route.weekday, area=route.area, calendar_week=route.calendar_week)
                planned_routes += 1
            except Exception as e:
                print(f"    Failed to plan weekend route for area {route.area} on {route.weekday} (KW {route.calendar_week}): {str(e)}")
                failed_routes += 1
        
        print(f"Route planning complete: {planned_routes} routes planned successfully, {failed_routes} routes failed")

    @staticmethod
    def _update_weekend_routes_from_aw_assignments(calendar_weeks: List[int]):
        """
        Update weekend routes with employee_id from AW (aw_nursing) assignments.
        Matches routes by area, weekday, and calendar_week.
        """
        if not calendar_weeks:
            return
        
        # Map route area to assignment area
        # Route areas can be "Nordkreis", "Südkreis", "Mitte", etc.
        # Assignment areas are "Nord", "Süd", "Mitte"
        def normalize_area(route_area: str) -> str:
            """Convert route area to assignment area format"""
            if not route_area:
                return None
            route_area_lower = route_area.lower()
            if 'nord' in route_area_lower:
                return 'Nord'
            elif 'süd' in route_area_lower or 'sued' in route_area_lower:
                return 'Süd'
            elif 'mitte' in route_area_lower:
                return 'Mitte'
            return None
        
        # Map weekday string to ISO weekday number (1=Monday, 7=Sunday)
        weekday_to_iso = {
            'saturday': 6,
            'sunday': 7
        }
        
        updated_count = 0
        
        # Get all weekend routes (employee_id is None, weekday is saturday or sunday)
        weekend_routes = Route.query.filter(
            Route.employee_id.is_(None),
            Route.weekday.in_(['saturday', 'sunday']),
            Route.calendar_week.in_(calendar_weeks)
        ).all()
        
        for route in weekend_routes:
            # Normalize route area to match assignment area
            assignment_area = normalize_area(route.area)
            if not assignment_area:
                continue
            
            # Get the date for this route (from calendar_week and weekday)
            try:
                current_year = datetime.now().year
                iso_weekday = weekday_to_iso.get(route.weekday.lower())
                if not iso_weekday:
                    continue
                
                # Calculate date from calendar week and weekday
                route_date = date.fromisocalendar(current_year, route.calendar_week, iso_weekday)
                
                # Find matching AW assignment
                assignment = OnCallAssignment.query.filter(
                    OnCallAssignment.duty_type == 'aw_nursing',
                    OnCallAssignment.area == assignment_area,
                    OnCallAssignment.date == route_date,
                    OnCallAssignment.calendar_week == route.calendar_week
                ).first()
                
                if assignment:
                    route.employee_id = assignment.employee_id
                    route.updated_at = datetime.utcnow()
                    updated_count += 1
                    print(f"    Updated route for area {route.area} on {route.weekday} (KW {route.calendar_week}) with employee_id {assignment.employee_id}")
            except Exception as e:
                print(f"    Error updating route {route.id} for area {route.area} on {route.weekday} (KW {route.calendar_week}): {str(e)}")
                continue
        
        if updated_count > 0:
            db.session.commit()
            print(f"    Updated {updated_count} weekend routes with AW assignments")
        else:
            print(f"    No weekend routes updated (no matching AW assignments found)")

    @staticmethod
    def import_patients(file_path) -> Dict[str, List[Any]]:
        """
        Import patients and their appointments from Excel file (supports multiple sheets)
        Each sheet is processed separately to ensure proper calendar week handling
        
        Neuer Importablauf:
        1. Alle Sheets aus der Excel-Datei laden
        2. Mitarbeiter einmal laden (sind kalenderwochenunabhängig)
        3. Jedes Sheet separat verarbeiten:
           - Patienten für dieses Sheet erstellen
           - Termine für diese Patienten erstellen
           - Routen für diese Termine erstellen
        4. Leere Routen für alle Mitarbeiter erstellen
        5. Alle Routen planen
        """
        try:
            # Step 1: Delete existing patient data (keep employees and their planning)
            print("Step 1: Deleting existing patient data...")
            ExcelImportService.delete_patient_data()
            
            # Step 2: Load all sheets from the Excel file
            print("Step 2: Loading all sheets from Excel file...")
            custom_na_values = ['', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan', 
                               '1.#IND', '1.#QNAN', '<NA>', 'N/A', 'NULL', 'NaN', 'None', 'n/a', 'nan', 'null']
            
            # Read all sheets from the Excel file
            all_sheets = pd.read_excel(file_path, sheet_name=None, keep_default_na=False, na_values=custom_na_values)
            
            if not all_sheets:
                raise ValueError("No sheets found in Excel file")
            
            print(f"Found {len(all_sheets)} sheets: {list(all_sheets.keys())}")
            
            # Step 3: Load all employees (kalenderwochenunabhängig)
            print("Step 3: Loading employees...")
            employees = Employee.query.all()
            print(f"Found {len(employees)} employees")
            
            # Step 4: Process each sheet separately
            all_patients = []
            all_appointments = []
            all_routes = []
            
            for sheet_name, df in all_sheets.items():
                print(f"\n=== Processing sheet: {sheet_name} with {len(df)} rows ===")
                
                # Show calendar weeks in this sheet
                kw_values = df['KW'].dropna().unique()
                print(f"  Calendar weeks in sheet '{sheet_name}': {sorted(kw_values)}")
                
                # Process this sheet
                sheet_result = ExcelImportService._process_single_sheet(df, sheet_name, employees)
                
                all_patients.extend(sheet_result['patients'])
                all_appointments.extend(sheet_result['appointments'])
                all_routes.extend(sheet_result['routes'])
            
            # Step 5: Create empty routes for all employees for all calendar weeks
            print("\nStep 5: Creating empty routes for all employees...")
            # Get all calendar weeks from the data
            calendar_weeks = list(set([p.calendar_week for p in all_patients if p.calendar_week is not None]))
            calendar_weeks.sort()
            empty_routes = ExcelImportService._create_empty_routes(employees, calendar_weeks)
            all_routes.extend(empty_routes)
            
            # Step 6: Plan all routes
            print("\nStep 6: Planning all routes...")
            ExcelImportService._plan_all_routes(all_routes)
            
            # Step 7: Update weekend routes with employee_id from AW assignments
            print("\nStep 7: Updating weekend routes with AW assignments...")
            ExcelImportService._update_weekend_routes_from_aw_assignments(calendar_weeks)
            
            # Calculate final statistics
            calendar_weeks_str = ', '.join(map(str, calendar_weeks)) if calendar_weeks else 'None'
            
            # Calculate appointment distribution by calendar week
            appointment_by_week = {}
            for app in all_appointments:
                patient = next((p for p in all_patients if p.id == app.patient_id), None)
                if patient and patient.calendar_week:
                    week_key = f"KW {patient.calendar_week}"
                    if week_key not in appointment_by_week:
                        appointment_by_week[week_key] = 0
                    appointment_by_week[week_key] += 1
            
            print("\nFinal appointment distribution by calendar week:")
            for week, count in sorted(appointment_by_week.items()):
                print(f"  {week}: {count} appointments")
            
            print(f"\nImport complete: {len(all_patients)} patients, {len(all_appointments)} appointments, {len(all_routes)} routes for calendar weeks: {calendar_weeks_str}")
            
            return {
                'patients': all_patients,
                'appointments': all_appointments,
                'routes': all_routes
            }

        except Exception as e:
            db.session.rollback()
            error_message = f"Fehler beim Importieren der Patienten: {str(e)}"
            print(error_message)
            raise Exception(error_message)
