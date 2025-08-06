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
        Expected columns: Vorname, Nachname, Strasse, PLZ, Ort, Funktion, Stellenumfang, Gebiet
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
                        is_active=True
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
    def import_patients(file_path) -> Dict[str, List[Any]]:
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
            custom_na_values = ['', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan', 
                               '1.#IND', '1.#QNAN', '<NA>', 'N/A', 'NULL', 'NaN', 'None', 'n/a', 'nan', 'null']
            df = pd.read_excel(file_path, keep_default_na=False, na_values=custom_na_values)
            required_columns = [
                'Gebiet', 'Touren', 'Nachname', 'Vorname', 'Ort', 'PLZ', 'Strasse', 'KW',
                'Montag', 'Uhrzeit/Info Montag', 'Dienstag', 'Uhrzeit/Info Dienstag', 
                'Mittwoch', 'Uhrzeit/Info Mittwoch', 'Donnerstag', 'Uhrzeit/Info Donnerstag',
                'Freitag', 'Uhrzeit/Info Freitag', 'Telefon', 'Telefon2'
            ]

            # Validate columns
            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                raise ValueError(f"Fehlende Spalten: {', '.join(missing)}")

            # 1. Patientenadressen extrahieren und deduplizieren
            patient_address_tuples = []
            for _, row in df.iterrows():
                street = str(row['Strasse']).strip()
                zip_code = str(row['PLZ']).strip()
                city = str(row['Ort']).strip()
                patient_address_tuples.append((street, zip_code, city))
            unique_patient_address_tuples = list(set(patient_address_tuples))

            # 2. Batch-Geocoding
            geocode_results = ExcelImportService.batch_geocode_addresses(unique_patient_address_tuples, max_workers=10)

            # Step 2: Create and save all patients from the Excel file
            print("Step 2: Creating patient records...")
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
            # Save all patients to the database to get IDs
            print(f"Saving {len(patients)} patients to database...")
            db.session.add_all(patients)
            db.session.commit()
            print(f"Saved {len(patients)} patients successfully")
            
            # Step 3: Load all employees
            print("Step 3: Loading employees...")
            employees = Employee.query.all()
            print(f"Found {len(employees)} employees")
            
            # Step 4: Create appointments for each patient and assign to employee by last name from 'Touren'
            print("Step 4: Creating appointments for each patient...")
            appointments = []
            weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
            for _, row in df.iterrows():
                patient = next((p for p in patients if 
                               p.last_name == str(row['Nachname']).strip() and
                               p.first_name == str(row['Vorname']).strip() and
                               p.street == str(row['Strasse']).strip()), None)
                if not patient:
                    print(f"  Warning: Patient not found for row {row}")
                    continue
                mitarbeiter_nachname_raw = str(row['Touren']).strip() if pd.notna(row['Touren']) else None
                if not mitarbeiter_nachname_raw:
                    print(f"  Warning: No employee last name in 'Touren' for patient {patient.first_name} {patient.last_name}")
                    continue
                # Suche Mitarbeiter, dessen Nachname als Substring in der Spalte steht
                matching_employees = [e for e in employees if e.last_name.lower() in mitarbeiter_nachname_raw.lower()]
                if len(matching_employees) == 0:
                    print(f"  Warning: No employee found with last name in '{mitarbeiter_nachname_raw}' for patient {patient.first_name} {patient.last_name}")
                    continue
                if len(matching_employees) > 1:
                    print(f"  Warning: Multiple employees match '{mitarbeiter_nachname_raw}' for patient {patient.first_name} {patient.last_name}: {[e.last_name for e in matching_employees]}")
                employee = matching_employees[0]
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
                        employee_id=employee.id,
                        weekday=english_weekday,
                        time=appointment_time,
                        visit_type=visit_type_value,
                        duration=duration,
                        info=time_info,
                        area=patient.area
                    )
                    appointments.append(appointment)
            print(f"  Created {len(appointments)} appointments.")
            db.session.add_all(appointments)
            db.session.commit()
            print(f"  Saved {len(appointments)} appointments to database.")
            
            # Step 6: Create routes for each employee by weekday (only HB appointments)
            print("\nStep 6: Creating routes for each employee by weekday...")
            routes = []
            
            # Mapping von employee_id auf area für schnellen Zugriff
            employee_id_to_area = {emp.id: emp.area for emp in employees}
            
            # Gruppiere Termine nach Mitarbeiter und Wochentag
            employee_weekday_appointments = {}
            for app in appointments:
                if app.visit_type == 'HB':  # Nur HB-Termine berücksichtigen
                    key = (app.employee_id, app.weekday)
                    if key not in employee_weekday_appointments:
                        employee_weekday_appointments[key] = []
                    employee_weekday_appointments[key].append(app)
            
            # Erstelle für jede Mitarbeiter-Wochentag-Kombination eine Route
            for (employee_id, weekday), apps in employee_weekday_appointments.items():
                if not apps:
                    continue
                
                # Neue Route erstellen mit allen HB-Terminen für diesen Mitarbeiter an diesem Wochentag
                appointment_ids = [app.id for app in apps]
                route_area = employee_id_to_area.get(employee_id, '')
                new_route = Route(
                    employee_id=employee_id,
                    weekday=weekday,
                    route_order=json.dumps(appointment_ids),
                    total_duration=0,  # Wird später aktualisiert
                    total_distance=0,  # Wird später aktualisiert
                    area=route_area
                )
                db.session.add(new_route)
                routes.append(new_route)
            
            # Speichere alle Routen in der Datenbank
            if routes:
                print(f"  Saving {len(routes)} routes to database...")
                db.session.commit()
                print(f"  Routes saved successfully")
            else:
                print("  No routes to save")
            
            # Step 7: Erstelle leere Routen für alle Mitarbeiter für jeden Wochentag,
            # falls noch keine Route existiert
            print("\nStep 7: Creating empty routes for all employees...")
            weekday_map = {
                'Montag': 'monday',
                'Dienstag': 'tuesday',
                'Mittwoch': 'wednesday',
                'Donnerstag': 'thursday',
                'Freitag': 'friday'
            }
            english_weekdays = list(weekday_map.values())
            
            empty_routes = []
            all_employees = Employee.query.all()
            for employee in all_employees:
                for weekday in english_weekdays:
                    # Prüfen, ob bereits eine Route für diesen Mitarbeiter und Tag existiert
                    existing_route = Route.query.filter_by(
                        employee_id=employee.id,
                        weekday=weekday
                    ).first()
                    
                    if not existing_route:
                        print(f"  Creating empty route for employee {employee.first_name} {employee.last_name} on {weekday}")
                        new_route = Route(
                            employee_id=employee.id,
                            weekday=weekday,
                            route_order=json.dumps([]),  # Leere Route
                            total_duration=0,
                            total_distance=0,
                            area=employee.area or ''
                        )
                        db.session.add(new_route)
                        empty_routes.append(new_route)
            
            if empty_routes:
                print(f"  Saving {len(empty_routes)} empty routes to database...")
                db.session.commit()
                print(f"  Empty routes saved successfully")
            else:
                print("  No empty routes to save")

            # Step 8: Plan routes for all non-empty routes
            print("\nStep 8: Planning routes for all non-empty routes...")
            route_planner = RoutePlanner()
            planned_routes = 0
            failed_routes = 0

            # Plan routes for all non-empty routes
            for route in routes:
                try:
                    print(f"  Planning route for employee {route.employee_id} on {route.weekday}")
                    route_planner.plan_route(route.weekday, route.employee_id)
                    planned_routes += 1
                except Exception as e:
                    print(f"  Failed to plan route for employee {route.employee_id} on {route.weekday}: {str(e)}")
                    failed_routes += 1
                    continue

            print(f"\nRoute planning complete: {planned_routes} routes planned successfully, {failed_routes} routes failed")
            
            # Return the results with summary
            calendar_week = patients[0].calendar_week if patients else None
            print(f"\nImport complete: {len(patients)} patients, {len(appointments)} appointments, {len(routes) + len(empty_routes)} routes (including {len(empty_routes)} empty routes) for calendar week {calendar_week}")
            
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
                'appointments': appointments,
                'routes': routes
            }

        except Exception as e:
            db.session.rollback()
            error_message = f"Fehler beim Importieren der Patienten: {str(e)}"
            print(error_message)
            raise Exception(error_message)