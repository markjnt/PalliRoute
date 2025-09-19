import os
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import googlemaps
from ..models.employee import Employee
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.route import Route
from .. import db
from .route_utils import (
    get_departure_time,
    calculate_route_duration,
    calculate_visit_duration,
    get_gmaps_client,
    get_weekend_start_location
)

class RoutePlanner:
    def __init__(self):
        self.gmaps = get_gmaps_client()

    def plan_route(self, weekday: str, employee_id: int = None, area: str = None, calendar_week: int = None) -> None:
        """
        Plan route for a single employee and weekday or for weekend routes by area
        This method preserves the current route order and only updates timing/distance calculations.
        Args:
            weekday: Day of the week
            employee_id: ID of the employee (for weekday routes)
            area: Area name (for weekend routes)
            calendar_week: Calendar week for the route (optional, will be detected if not provided)
        """
        try:
            # Determine if this is a weekend route
            is_weekend = weekday.lower() in ['saturday', 'sunday']
            
            if is_weekend and not area:
                raise ValueError("Area is required for weekend routes")
            elif not is_weekend and not employee_id:
                raise ValueError("Employee ID is required for weekday routes")
            
            # Get calendar week from any patient
            patient = Patient.query.filter(Patient.calendar_week.isnot(None)).first()
            if not patient:
                raise ValueError("No patients found with calendar week information")
            
            # Get route from database
            if is_weekend:
                query = Route.query.filter_by(
                    employee_id=None,
                    weekday=weekday.lower(),
                    area=area
                )
                if calendar_week:
                    query = query.filter_by(calendar_week=calendar_week)
                route = query.first()
                if not route:
                    raise ValueError(f"No weekend route found for area {area} on {weekday} (KW {calendar_week})")
            else:
                query = Route.query.filter_by(
                    employee_id=employee_id,
                    weekday=weekday.lower()
                )
                if calendar_week:
                    query = query.filter_by(calendar_week=calendar_week)
                route = query.first()
                if not route:
                    raise ValueError(f"No route found for employee {employee_id} on {weekday} (KW {calendar_week})")

            # If route order is empty, set distance and duration to 0
            if not route.get_route_order():
                route.polyline = None
                route.total_distance = 0
                route.total_duration = 0
                route.updated_at = datetime.utcnow()
                db.session.commit()
                return

            # Get appointments from route order
            appointment_ids = eval(route.route_order)
            appointments = Appointment.query.filter(Appointment.id.in_(appointment_ids)).all()
            
            if not appointments:
                raise ValueError(f"No appointments found for the IDs in route order: {appointment_ids}")

            # Get coordinates for all locations
            if is_weekend:
                # For weekend routes, use a central location in the area as start/end point
                start_location = get_weekend_start_location(area)
            else:
                # Get employee location for weekday routes
                employee = Employee.query.filter_by(id=employee_id).first()
                if not employee:
                    raise ValueError(f"Employee with ID {employee_id} not found")
                start_location = {'lat': employee.latitude, 'lng': employee.longitude}

            # Get coordinates for appointments in route order
            waypoints = []
            for appointment in appointments:
                patient = appointment.patient
                waypoints.append((patient.latitude, patient.longitude))

            # Calculate departure time - use calendar_week from route or parameter
            route_calendar_week = calendar_week or route.calendar_week
            if not route_calendar_week:
                # Fallback: get from any patient if not available
                patient = Patient.query.filter(Patient.calendar_week.isnot(None)).first()
                route_calendar_week = patient.calendar_week if patient else None
            
            departure_time = get_departure_time(weekday, route_calendar_week)

            # Calculate route - use waypoints as list of tuples
            result = self.gmaps.directions(
                origin=start_location,
                destination=start_location,
                waypoints=waypoints,  # Use list of tuples
                optimize_waypoints=False,  # Don't optimize, use existing order
                departure_time=departure_time,
                mode="driving"
            )

            if not result:
                raise Exception("Failed to calculate route")

            # Get route information
            route_info = result[0]
            
            # Calculate durations
            total_distance, total_duration = calculate_route_duration(route_info['legs'])
            total_visit_duration = calculate_visit_duration(appointments)
            
            # Update route with new information
            route.polyline = route_info['overview_polyline']['points']
            route.total_distance = total_distance
            route.total_duration = total_duration + total_visit_duration
            route.updated_at = datetime.utcnow()
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            if is_weekend:
                raise Exception(f'Failed to plan weekend route for area {area}: {str(e)}')
            else:
                raise Exception(f'Failed to plan route for employee {employee_id}: {str(e)}')