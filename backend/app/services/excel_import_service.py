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
from .. import db
import json
from .route_planner import RoutePlanner

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
    def delete_all_data():
        """
        Deletes all data from the database in the correct order to maintain referential integrity
        """
        try:
            # Delete in correct order to maintain referential integrity
            Route.query.delete()
            Appointment.query.delete()
            Patient.query.delete()
            Employee.query.delete()
            db.session.commit()
            print("Successfully deleted all data from database")
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error deleting data: {str(e)}")

    @staticmethod
    def import_employees(file_path) -> Dict[str, List[Any]]:
        """
        Import employees from Excel file
        Expected columns: Vorname, Nachname, Strasse, PLZ, Ort, Funktion, Stellenumfang, Gebiet, Alias
        """
        try:
            # First delete all existing data
            ExcelImportService.delete_all_data()
            
            df = pd.read_excel(file_path)
            required_columns = ['Vorname', 'Nachname', 'Strasse', 'PLZ', 'Ort', 'Funktion', 'Stellenumfang', 'Gebiet']
            
            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Fehlende Spalten: {', '.join(missing)}")

            valid_areas = ['Nordkreis', 'Südkreis']
            valid_functions = ['PDL', 'Pflegekraft', 'Arzt', 'Honorararzt', 'Physiotherapie']
            added_employees = []

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

            # 3. Employees anlegen
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

                    employee = Employee(
                        first_name=str(row['Vorname']).strip(),
                        last_name=str(row['Nachname']).strip(),
                        street=street,
                        zip_code=zip_code,
                        city=city,
                        latitude=latitude,
                        longitude=longitude,
                        function=function,
                        work_hours=work_hours,
                        area=area,
                        alias=alias
                    )
                    added_employees.append(employee)
                    db.session.add(employee)
                except Exception as row_error:
                    raise ValueError(f"Fehler in Zeile {idx + 2}: {str(row_error)}")

            db.session.commit()
            return {
                'added': added_employees,
                'updated': []
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
        
        # 1. Create patients for this sheet
        print(f"  Step 1: Creating patients from sheet {sheet_name}...")
        patients = ExcelImportService._create_patients_from_sheet(df, sheet_name)
        
        # 2. Create appointments for this sheet's patients
        print(f"  Step 2: Creating appointments for sheet {sheet_name}...")
        appointments = ExcelImportService._create_appointments_from_sheet(df, patients, employees, sheet_name)
        
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
        for _, row in df.iterrows():
            street = str(row['Strasse'])
            zip_code = str(row['PLZ'])
            city = str(row['Ort'])
            latitude, longitude = geocode_results.get((street.strip(), zip_code.strip(), city.strip()), (None, None))
            patient = Patient(
                first_name=str(row['Vorname']),
                last_name=str(row['Nachname']),
                street=street,
                zip_code=zip_code,
                city=city,
                latitude=latitude,
                longitude=longitude,
                phone1=str(row['Telefon']) if pd.notna(row['Telefon']) else None,
                phone2=str(row['Telefon2']) if pd.notna(row['Telefon2']) else None,
                calendar_week=int(row['KW']) if pd.notna(row['KW']) else None,
                area=str(row['Gebiet']) if pd.notna(row['Gebiet']) else None
            )
            patients.append(patient)
        
        # Save patients to get IDs
        print(f"    Saving {len(patients)} patients from sheet {sheet_name}...")
        db.session.add_all(patients)
        db.session.commit()
        print(f"    Saved {len(patients)} patients successfully")
        
        return patients

    @staticmethod
    def _create_appointments_from_sheet(df: pd.DataFrame, patients: List[Patient], employees: List[Employee], sheet_name: str) -> List[Appointment]:
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
                print(f"    Warning: No employee last name in 'Touren' for patient {patient.first_name} {patient.last_name} (KW {patient.calendar_week})")
                continue
            
            # Find matching employees
            matching_employees = [e for e in employees if e.last_name.lower() in mitarbeiter_nachname_raw.lower()]
            if len(matching_employees) == 0:
                print(f"    Warning: No employee found with last name in '{mitarbeiter_nachname_raw}' for patient {patient.first_name} {patient.last_name} (KW {patient.calendar_week})")
                continue
            if len(matching_employees) > 1:
                print(f"    Warning: Multiple employees match '{mitarbeiter_nachname_raw}' for patient {patient.first_name} {patient.last_name}: {[e.last_name for e in matching_employees]}")
            
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
                        visit_type = "HB"
                    duration = VISIT_TYPE_DURATIONS.get(visit_type, 0)
                
                # Check for specific responsible employee
                responsible_column = f"Zuständige {weekday}"
                assigned_employee = default_employee
                
                if has_responsible_columns and responsible_column in df.columns:
                    responsible_alias = row.get(responsible_column)
                    if pd.notna(responsible_alias) and str(responsible_alias).strip() != "":
                        alias = str(responsible_alias).strip()
                        alias_employee = next((e for e in employees if e.alias and e.alias.strip() == alias), None)
                        if alias_employee:
                            assigned_employee = alias_employee
                            print(f"      {weekday}: Assigned to {alias_employee.first_name} {alias_employee.last_name} (alias: {alias})")
                        else:
                            print(f"      Warning: No employee found with alias '{alias}' for {weekday}, using default employee")
                
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
                
                # Create appointment
                weekday_map = {
                    'Montag': 'monday',
                    'Dienstag': 'tuesday',
                    'Mittwoch': 'wednesday',
                    'Donnerstag': 'thursday',
                    'Freitag': 'friday'
                }
                english_weekday = weekday_map.get(weekday, weekday.lower())
                visit_type_value = visit_type if visit_type is not None else ""
                appointment = Appointment(
                    patient_id=patient.id,
                    employee_id=assigned_employee.id,
                    weekday=english_weekday,
                    time=appointment_time,
                    visit_type=visit_type_value,
                    duration=duration,
                    info=time_info,
                    area=patient.area,
                    calendar_week=patient.calendar_week  # Set calendar_week from patient
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
                            visit_type = "HB"
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
                        appointment = Appointment(
                            patient_id=patient.id,
                            employee_id=None,  # No employee assignment for weekend appointments
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
            if app.visit_type in ('HB', 'NA') and app.employee_id is None and app.weekday in ['saturday', 'sunday']:
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
            # Step 1: Load all sheets from the Excel file
            print("Step 1: Loading all sheets from Excel file...")
            custom_na_values = ['', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan', 
                               '1.#IND', '1.#QNAN', '<NA>', 'N/A', 'NULL', 'NaN', 'None', 'n/a', 'nan', 'null']
            
            # Read all sheets from the Excel file
            all_sheets = pd.read_excel(file_path, sheet_name=None, keep_default_na=False, na_values=custom_na_values)
            
            if not all_sheets:
                raise ValueError("No sheets found in Excel file")
            
            print(f"Found {len(all_sheets)} sheets: {list(all_sheets.keys())}")
            
            # Step 2: Load all employees (kalenderwochenunabhängig)
            print("Step 2: Loading employees...")
            employees = Employee.query.all()
            print(f"Found {len(employees)} employees")
            
            # Step 3: Process each sheet separately
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
            
            # Step 4: Create empty routes for all employees for all calendar weeks
            print("\nStep 4: Creating empty routes for all employees...")
            calendar_weeks = list(set([p.calendar_week for p in all_patients if p.calendar_week is not None]))
            empty_routes = ExcelImportService._create_empty_routes(employees, calendar_weeks)
            all_routes.extend(empty_routes)
            
            # Step 5: Plan all routes
            print("\nStep 5: Planning all routes...")
            ExcelImportService._plan_all_routes(all_routes)
            
            # Calculate final statistics
            calendar_weeks = list(set([p.calendar_week for p in all_patients if p.calendar_week is not None]))
            calendar_weeks.sort()
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
