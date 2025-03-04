import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
import googlemaps
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route

class RouteOptimizer:
    def __init__(self):
        api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not api_key:
            raise ValueError("Google Maps API key not found in environment variables")
        self.gmaps = googlemaps.Client(key=api_key)

    def optimize_route(self, employee: Employee, appointments: List[Appointment], date: datetime) -> Route:
        """
        Optimize route for a given employee and their appointments using Google Maps Routes API
        """
        if not appointments:
            return None

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
            waypoints.append({
                'location': coords,
                'appointment': appointment
            })

        # Calculate optimal route using Google Maps Routes API
        result = self.gmaps.directions(
            origin=employee_location,
            destination=employee_location,  # Return to start
            waypoints=waypoints,
            optimize_waypoints=True,
            departure_time=date,
            mode="driving"
        )

        if not result:
            raise Exception("Failed to calculate route")

        # Create optimized route
        route = Route(
            employee_id=employee.id,
            weekday=date.strftime('%A').lower(),
            route_order=self._create_route_order(result[0], appointments),
            total_duration=self._calculate_total_duration(result[0], appointments)
        )

        return route

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

    def _calculate_total_duration(self, route_result: Dict[str, Any], appointments: List[Appointment]) -> int:
        """Calculate total duration including travel time and appointment durations"""
        # Sum up driving durations from route legs
        travel_time = sum(
            leg.get('duration', {}).get('value', 0)
            for leg in route_result.get('legs', [])
        )

        # Add appointment durations
        appointment_time = sum(appointment.duration for appointment in appointments)

        # Return total duration in minutes
        return int((travel_time / 60) + appointment_time) 