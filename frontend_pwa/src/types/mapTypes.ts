import { Route, Patient, Appointment, Employee, Weekday } from './models';

// Main props for the map container
export interface MapContainerProps {
  apiKey: string;
}

// Marker data for map
export interface MarkerData {
  position: google.maps.LatLng;
  title: string;
  label?: string;
  type: 'employee' | 'patient';
  visitType?: string; // HB, TK, or NA
  employeeType?: string; // Job title for employees
  patientId?: number;
  appointmentId?: number;
  employeeId?: number;
  routePosition?: number; // Position in the route (1-based index)
  displayPosition?: google.maps.LatLng; // Position to show InfoWindow at (for expanded markers)
  routeId?: number; // ID der zugehörigen Route (für Sichtbarkeit)
  isInactive?: boolean; // Marker gehört zu keiner sichtbaren Route
  routeArea?: string; // Area der zugehörigen Route (Nordkreis/Südkreis)
}

// Group of markers at the same location
export interface MarkerGroup {
  markers: MarkerData[];
  position: google.maps.LatLng;
  count: number;
}

// Route path data for polylines
export interface RoutePathData {
  employeeId: number;
  routeId: number;
  routeOrder: number[];
  color: string;
  polyline: string;
  totalDistance: number;
  totalDuration: number;
  employeeName: string;
}
