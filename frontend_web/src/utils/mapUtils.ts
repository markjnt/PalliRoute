import { MarkerData, MarkerGroup } from '../types/mapTypes';
import { Route, Employee, Patient, Appointment } from '../types/models';
import { appointmentTypeColors, employeeTypeColors } from '../utils/colors';

// Constants
export const libraries: ("places" | "geocoding" | "geometry")[] = ['places', 'geocoding', 'geometry'];

export const containerStyle = {
  width: '100%',
  height: '100%'
};

export const defaultCenter = {
  lat: 51.0267, // Gummersbach
  lng: 7.5683
};

export const defaultZoom = 10;

export const mapOptions: google.maps.MapOptions = {
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }] // Hides points of interest labels
    }
  ]
};

// Map weekday names (English to German)
export const weekdayMap: Record<string, string> = {
  'monday': 'Montag',
  'tuesday': 'Dienstag',
  'wednesday': 'Mittwoch',
  'thursday': 'Donnerstag',
  'friday': 'Freitag',
  'saturday': 'Samstag',
  'sunday': 'Sonntag'
};

// Get current weekday in lowercase English (e.g., 'monday')
export const getCurrentWeekday = (): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  return days[today];
};

// Parse route order from string or array
export const parseRouteOrder = (routeOrder: any): number[] => {
  if (Array.isArray(routeOrder)) {
    return routeOrder;
  }
  
  try {
    const parsed = JSON.parse(routeOrder as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse route_order:', error);
    return [];
  }
};

// Check if a route is valid (has non-empty route_order)
export const isValidRoute = (route: Route): boolean => {
  const routeOrder = parseRouteOrder(route.route_order);
  return routeOrder.length > 0;
};

// Check if appointments in route_order exist for the given weekday
export const hasValidRouteOrder = (route: Route, appointments: Appointment[], selectedWeekday: string): boolean => {
  // Parse route_order
  const routeOrder = parseRouteOrder(route.route_order);
  
  // Check if array exists and is not empty
  if (!routeOrder || routeOrder.length === 0) {
    return false;
  }
  
  // Check if all IDs in routeOrder exist as appointments for this weekday
  const appointmentsExist = routeOrder.every(appointmentId => {
    return appointments.some(appointment => 
      appointment.id === appointmentId && 
      appointment.weekday === selectedWeekday
    );
  });
  
  return appointmentsExist;
};

// Get color for appointment type
export const getColorForVisitType = (visitType?: string): string => {
  if (!visitType) return appointmentTypeColors.default;
  return appointmentTypeColors[visitType] || appointmentTypeColors.default;
};

// Get color for employee type
export const getColorForEmployeeType = (employeeType?: string): string => {
  if (!employeeType) return employeeTypeColors.default;
  
  if (employeeType.includes('Arzt') && !employeeType.includes('Honorar')) {
    return employeeTypeColors['Arzt'];
  } else if (employeeType.includes('Honorararzt')) {
    return employeeTypeColors['Honorararzt'];
  }
  
  return employeeTypeColors.default;
};

// Create employee marker data
export const createEmployeeMarkerData = (employee: Employee, routeId?: number): MarkerData | null => {
  // Check if we have latitude and longitude from the backend
  if (employee.latitude && employee.longitude) {
    // Create position using coordinates from backend
    const position = new google.maps.LatLng(employee.latitude, employee.longitude);
    
    return {
      position,
      title: `${employee.first_name} ${employee.last_name} - ${employee.function || 'Mitarbeiter'}`,
      type: 'employee',
      employeeType: employee.function,
      employeeId: employee.id,
      routeId
      // area entfernt
    };
  } else {
    // If no coordinates, log warning and skip
    console.warn(`No coordinates for employee: ${employee.first_name} ${employee.last_name}`);
    return null;
  }
};

// Create patient marker data
export const createPatientMarkerData = (patient: Patient, appointment: Appointment, position?: number, routeId?: number): MarkerData | null => {
  // Check if we have latitude and longitude from the backend
  if (patient.latitude && patient.longitude) {
    // Create position using coordinates from backend
    const position_coords = new google.maps.LatLng(patient.latitude, patient.longitude);
    
    // If it's a HB (home visit) appointment and has a position, use it as the label
    const label = appointment.visit_type === 'HB' && position ? position.toString() : undefined;
    
    return {
      position: position_coords,
      title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type}`,
      type: 'patient',
      label,
      visitType: appointment.visit_type,
      patientId: patient.id,
      appointmentId: appointment.id,
      routePosition: position,
      routeId
      // area entfernt
    };
  } else {
    // If no coordinates, log warning and skip
    console.warn(`No coordinates for patient: ${patient.first_name} ${patient.last_name}`);
    return null;
  }
};

// Create weekend area marker data (central starting point for weekend routes)
export const createWeekendAreaMarkerData = (area: string, routeId?: number): MarkerData | null => {
  // Central starting location for all weekend routes: Auf der Brück 9, 51645 Gummersbach
  const weekendStartLocation = { lat: 50.9833022, lng: 7.5412243 };
  const position = new google.maps.LatLng(weekendStartLocation.lat, weekendStartLocation.lng);
  
  return {
    position,
    title: area === 'Wochenend-Touren' ? 'Wochenend-Startpunkt' : `Wochenend-Startpunkt - ${area}-Bereich`,
    type: 'weekend_area',
    area,
    routeId
  };
};

// Create weekend patient marker data (for weekend appointments without employee assignment)
export const createWeekendPatientMarkerData = (patient: Patient, appointment: Appointment, area: string, position?: number, routeId?: number): MarkerData | null => {
  // Check if we have latitude and longitude from the backend
  if (patient.latitude && patient.longitude) {
    // Create position using coordinates from backend
    const position_coords = new google.maps.LatLng(patient.latitude, patient.longitude);
    
    // If it's a HB (home visit) appointment and has a position, use it as the label
    const label = appointment.visit_type === 'HB' && position ? position.toString() : undefined;
    
    return {
      position: position_coords,
      title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type} (${area})`,
      type: 'weekend_patient',
      label,
      visitType: appointment.visit_type,
      patientId: patient.id,
      appointmentId: appointment.id,
      routePosition: position,
      routeId,
      area
    };
  } else {
    // If no coordinates, log warning and skip
    console.warn(`No coordinates for weekend patient: ${patient.first_name} ${patient.last_name}`);
    return null;
  }
}; 