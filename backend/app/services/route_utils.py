from datetime import datetime, timedelta, date
from typing import Dict, List, Tuple
import googlemaps
import os
from app.models.appointment import VISIT_TYPE_DURATIONS

def get_departure_time(weekday: str, calendar_week: int) -> datetime:
    """
    Calculate the departure time for a given weekday and calendar week
    """
    current_year = datetime.now().year
    
    # Map weekday names to ISO weekday numbers (1 = Monday, 7 = Sunday)
    weekday_map = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 7
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
            
    return departure_time

def calculate_route_duration(legs: List[Dict]) -> Tuple[float, int]:
    """
    Calculate total distance and duration from route legs
    Returns: (distance in km, duration in minutes)
    """
    total_distance = sum(leg['distance']['value'] for leg in legs) / 1000  # Convert to kilometers
    total_duration = sum(leg['duration']['value'] for leg in legs) // 60  # Convert to minutes
    return total_distance, total_duration

def calculate_visit_duration(appointments: List) -> int:
    """
    Calculate total visit duration based on appointment types
    Returns: duration in minutes
    """
    return sum(
        VISIT_TYPE_DURATIONS.get(appointment.visit_type, 0)
        for appointment in appointments
    )

def get_weekend_start_location(area: str) -> Dict[str, float]:
    """
    Get a central starting location for weekend routes based on area
    For weekend routes, we need a central point in the area as starting point
    """
    # Central starting location for all weekend routes: Auf der Brück 9, 51645 Gummersbach
    weekend_start_location = {'lat': 50.9833022, 'lng': 7.5412243}  # Gummersbach coordinates

    return weekend_start_location

def get_gmaps_client() -> googlemaps.Client:
    """Get Google Maps client with API key"""
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key:
        raise ValueError("Google Maps API key not found in environment variables")
    return googlemaps.Client(key=api_key) 