import os
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import googlemaps
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route
from .. import db

class RoutePlanner:
    def __init__(self):
        api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not api_key:
            raise ValueError("Google Maps API key not found in environment variables")
        self.gmaps = googlemaps.Client(key=api_key)

    def plan_route(self, weekday: str, employee_id: int, optimize: bool = True) -> None:
        """
        Plan route for a single employee and weekday
        Args:
            weekday: Day of the week
            employee_id: ID of the employee
            optimize: Whether to optimize the route order (default: True)
        """
        # Get the calendar week from any patient
        patient = Patient.query.filter(Patient.calendar_week.isnot(None)).first()
        if not patient:
            raise ValueError("No patients found with calendar week information")
            
        calendar_week = patient.calendar_week
        current_year = datetime.now().year
        
        # Map weekday names to ISO weekday numbers (1 = Monday, 7 = Sunday)
        weekday_map = {
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5
        }
        
        # Get the date using fromisocalendar
        target_date = date.fromisocalendar(current_year, calendar_week, weekday_map.get(weekday, 1))

        # Create departure time at 8:00
        departure_time = datetime.combine(target_date, datetime.min.time()).replace(hour=8, minute=0, second=0, microsecond=0)
        current_time = datetime.now()

        # If departure time is in the past, use current date at 8:00
        if departure_time < current_time:
            # Set to today at 8:00
            departure_time = current_time.replace(hour=8, minute=0, second=0, microsecond=0)
            # If it's already past 8:00 today, use tomorrow at 8:00
            if departure_time < current_time:
                departure_time = departure_time + timedelta(days=1)

        # Get employee
        employee = Employee.query.filter_by(id=employee_id).first()
        if not employee:
            raise ValueError(f"Employee with ID {employee_id} not found")

        try:
            # Get appointments for this employee on this weekday
            appointments = Appointment.query.filter_by(
                employee_id=employee.id,
                weekday=weekday.lower(),
                visit_type='HB'  # Only consider HB appointments
            ).all()

            if not appointments:
                print(f"No HB appointments found for employee {employee.id} on {weekday}")
                # Early return if no appointments found
                return

            # Check if route exists
            route = Route.query.filter_by(
                employee_id=employee.id,
                weekday=weekday.lower()
            ).first()

            if not route:
                raise ValueError(f"No existing route found for employee {employee.id} on {weekday}")

            # Convert employee address to coordinates
            employee_location = self._get_coordinates(
                f"{employee.street}, {employee.zip_code} {employee.city}"
            )

            # Get coordinates for all appointments
            waypoints = []
            for appointment in appointments:
                patient = appointment.patient
                coords = self._get_coordinates(
                    f"{patient.street}, {patient.zip_code} {patient.city}"
                )
                # Format waypoint as a tuple of (lat, lng)
                waypoints.append((coords['lat'], coords['lng']))

            # Calculate route using Google Maps Routes API
            result = self.gmaps.directions(
                origin=employee_location,
                destination=employee_location,  # Return to start
                waypoints=waypoints,
                optimize_waypoints=optimize,
                departure_time=departure_time,
                mode="driving"
            )

            if not result:
                raise Exception("Failed to calculate route")

            # Extract route information
            route_info = result[0]
            legs = route_info['legs']
            
            # Calculate total distance and duration
            total_distance = sum(leg['distance']['value'] for leg in legs) / 1000  # Convert to kilometers
            total_duration = sum(leg['duration']['value'] for leg in legs) // 60  # Convert to minutes
            
            # Add visit durations to total duration
            visit_durations = {
                'HB': 25,  # 25 minutes for Hausbesuch
                'NA': 120  # 120 minutes for Nachtbesuch
            }
            
            # Calculate total visit duration based on appointment types
            total_visit_duration = sum(
                visit_durations.get(appointment.visit_type, 0)
                for appointment in appointments
            )
            
            # Add visit durations to total duration
            total_duration += total_visit_duration
            
            # Get the polyline
            polyline = route_info['overview_polyline']['points']

            # Update route information
            route.route_order = self._create_route_order(result[0], appointments)
            route.total_distance = total_distance
            route.total_duration = total_duration
            route.polyline = polyline
            route.updated_at = datetime.utcnow()
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise Exception(f'Failed to plan route for employee {employee.id}: {str(e)}')

    def _get_coordinates(self, address: str) -> Dict[str, float]:
        """Get coordinates for an address using Google Maps Geocoding"""
        result = self.gmaps.geocode(address)
        if not result:
            raise ValueError(f"Could not geocode address: {address}")
        location = result[0]['geometry']['location']
        return {'lat': location['lat'], 'lng': location['lng']}

    def _create_route_order(self, route_result: Dict[str, Any], appointments: List[Appointment]) -> str:
        """Create JSON array of appointment IDs in optimized order"""
        waypoint_order = route_result.get('waypoint_order', [])
        ordered_appointments = [appointments[i].id for i in waypoint_order]
        return str(ordered_appointments)