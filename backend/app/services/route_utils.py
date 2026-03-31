from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple
import googlemaps
import math
import os
from app.models.appointment import VISIT_TYPE_DURATIONS


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two WGS84 points (Haversine)."""
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def distance_km_to_area_start(
    employee_lat: Optional[float],
    employee_lng: Optional[float],
    area: str,
) -> Optional[float]:
    """
    Distance in km from employee location to the canonical start point of the given area
    (Nord / Mitte / Süd). Used e.g. for automatic planning to prefer assigning
    the employee closest to the tour start.
    Returns None if employee has no coordinates.
    """
    if employee_lat is None or employee_lng is None:
        return None
    start = get_tour_area_start_location(area)
    return haversine_km(
        employee_lat, employee_lng,
        start['lat'], start['lng'],
    )

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

def get_tour_area_start_location(area: str) -> Dict[str, float]:
    """
    Zentraler Startpunkt für AW-Flächenrouten (Nord / Mitte / Süd), analog Touren-Wochenende.

    Args:
        area: Area name (Nord, Mitte, Süd, or variations like Nordkreis, Südkreis)

    Returns:
        Dictionary with 'lat' and 'lng' keys containing the coordinates
    """
    # Coordinates are geocoded from the actual addresses
    tour_area_start_locations = {
        'Mitte': {
            'lat': 50.9833022, 
            'lng': 7.5412243,  # Auf der Brück 9, 51645 Gummersbach
        },
        'Nord': {
            'lat': 51.11806869506836,  # Lüdenscheider Str. 5, 51688 Wipperfürth
            'lng': 7.399380207061768,
        },
        'Süd': {
            'lat': 50.8775055,  # Bahnhofstraße 1, 51545 Waldbröl
            'lng': 7.6168993,
        }
    }
    
    # Normalize area name (handle variations like 'Nordkreis' -> 'Nord')
    area_normalized = area
    if 'Nord' in area or area == 'Nordkreis':
        area_normalized = 'Nord'
    elif 'Süd' in area or area == 'Südkreis':
        area_normalized = 'Süd'
    elif 'Mitte' in area:
        area_normalized = 'Mitte'
    
    # Get location for the area, default to Mitte if not found
    location = tour_area_start_locations.get(area_normalized, tour_area_start_locations['Mitte'])
    
    return {'lat': location['lat'], 'lng': location['lng']}

def get_gmaps_client() -> googlemaps.Client:
    """Get Google Maps client with API key"""
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key:
        raise ValueError("Google Maps API key not found in environment variables")
    return googlemaps.Client(key=api_key) 