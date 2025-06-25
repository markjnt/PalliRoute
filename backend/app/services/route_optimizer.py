from datetime import datetime
from typing import List, Dict, Any
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route
from .. import db
from .route_utils import (
    get_departure_time,
    get_coordinates,
    calculate_route_duration,
    calculate_visit_duration,
    get_gmaps_client
)

class RouteOptimizer:
    def __init__(self):
        self.gmaps = get_gmaps_client()

    def _create_route_order(self, route_result: Dict[str, Any], appointments: List[Appointment]) -> str:
        """Create JSON array of appointment IDs in optimized order"""
        waypoint_order = route_result.get('waypoint_order', [])
        ordered_appointments = [appointments[i].id for i in waypoint_order]
        return str(ordered_appointments)

    def optimize_route(self, weekday: str, employee_id: int) -> None:
        """
        Optimize route for a single employee and weekday
        Args:
            weekday: Day of the week
            employee_id: ID of the employee
        """
        try:
            # Get calendar week from any patient
            patient = Patient.query.filter(Patient.calendar_week.isnot(None)).first()
            if not patient:
                raise ValueError("No patients found with calendar week information")
                        
            # Get route from database
            route = Route.query.filter_by(
                employee_id=employee_id,
                weekday=weekday.lower()
            ).first()

            if not route:
                raise ValueError(f"No route found for employee {employee_id} on {weekday}")

            # If route order is empty, set distance and duration to 0
            if not route.get_route_order():
                route.polyline = None
                route.total_distance = 0
                route.total_duration = 0
                route.updated_at = datetime.utcnow()
                db.session.commit()
                return

            # Get employee
            employee = Employee.query.filter_by(id=employee_id).first()
            if not employee:
                raise ValueError(f"Employee with ID {employee_id} not found")

            # Get appointments from route order
            appointment_ids = eval(route.route_order)
            appointments = Appointment.query.filter(Appointment.id.in_(appointment_ids)).all()
            
            if not appointments:
                raise ValueError(f"No appointments found for the IDs in route order: {appointment_ids}")

            # Get coordinates for all locations
            employee_location = get_coordinates(
                self.gmaps,
                f"{employee.street}, {employee.zip_code} {employee.city}"
            )

            # Get coordinates for appointments
            waypoints = []
            for appointment in appointments:
                patient = appointment.patient
                coords = get_coordinates(
                    self.gmaps,
                    f"{patient.street}, {patient.zip_code} {patient.city}"
                )
                waypoints.append((coords['lat'], coords['lng']))

            # Calculate departure time
            departure_time = get_departure_time(weekday, patient.calendar_week)

            # Calculate optimized route
            result = self.gmaps.directions(
                origin=employee_location,
                destination=employee_location,
                waypoints=waypoints,
                optimize_waypoints=True,  # Enable optimization
                departure_time=departure_time,
                mode="driving"
            )

            if not result:
                raise Exception("Failed to calculate optimized route")

            # Get route information
            route_info = result[0]
            
            # Calculate durations
            total_distance, total_duration = calculate_route_duration(route_info['legs'])
            total_visit_duration = calculate_visit_duration(appointments)
            
            # Update route with new information
            route.polyline = route_info['overview_polyline']['points']
            route.total_distance = total_distance
            route.total_duration = total_duration + total_visit_duration
            route.route_order = self._create_route_order(route_info, appointments)
            route.updated_at = datetime.utcnow()
            db.session.commit()

        except Exception as e:
            print(e)
            db.session.rollback()
            raise Exception(f'Failed to optimize route for employee {employee_id}: {str(e)}') 