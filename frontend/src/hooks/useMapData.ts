import { useState, useEffect, useCallback } from 'react';
import { Weekday } from '../types/models';
import { MarkerData, RoutePathData } from '../types/mapTypes';
import { useEmployees } from '../services/queries/useEmployees';
import { usePatients } from '../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../services/queries/useAppointments';
import { useRoutes } from '../services/queries/useRoutes';
import { 
  createEmployeeMarkerData, 
  createPatientMarkerData, 
  isValidRoute,
  parseRouteOrder 
} from '../utils/mapUtils';

/**
 * Custom hook to manage map data
 */
export const useMapData = (selectedWeekday: string) => {
  // State for markers and routes
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React Query hooks for data fetching
  const { 
    data: employees = [], 
    isLoading: employeesLoading,
    refetch: refetchEmployees
  } = useEmployees();
  
  const {
    data: patients = [],
    isLoading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients
  } = usePatients();
  
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  
  const {
    data: routes = [],
    isLoading: routesLoading,
    error: routesError,
    refetch: refetchRoutes
  } = useRoutes({ weekday: selectedWeekday as Weekday });

  // Store routes in state when they change
  useEffect(() => {
    if (routes && routes.length > 0) {
      setAllRoutes(routes);
    }
  }, [routes]);

  // Filter routes when weekday changes
  useEffect(() => {
    if (allRoutes.length > 0) {
      // Filter routes for the selected day AND only valid routes with non-empty route_order
      const filtered = allRoutes.filter(route => 
        route.weekday === selectedWeekday && isValidRoute(route)
      );
      
      // Store filtered routes
      setFilteredRoutes(filtered);
      
      // Log for debugging
      console.log(`${filtered.length} valid routes found for ${selectedWeekday}`);
    }
  }, [selectedWeekday, allRoutes]);

  // Create markers from employees and patients
  const createMarkers = useCallback(async () => {
    if (!window.google || !window.google.maps) {
      return;
    }
    
    setLoading(true);
    const newMarkers: MarkerData[] = [];
    
    try {
      // Create employee markers for all active employees
      if (employees.length > 0) {
        const activeEmployees = employees.filter(e => e.is_active);
        for (const employee of activeEmployees) {
          const employeeMarkerData = createEmployeeMarkerData(employee);
          if (employeeMarkerData) newMarkers.push(employeeMarkerData);
        }
      }
      
      // Only create patient markers if we have both patients and appointments
      if (patients.length > 0 && appointments.length > 0) {
        // Get appointments for the selected day with a non-empty visit_type
        const appointmentsForDay = appointments.filter(appointment => 
          appointment.weekday === selectedWeekday && 
          appointment.visit_type && 
          appointment.visit_type.trim() !== ''
        );
        
        // Get routes for the selected day to determine patient positions
        const routesForDay = filteredRoutes;
        
        // Create a map of appointment IDs to their position in the route
        const appointmentPositions = new Map<number, number>();
        
        // Process all routes for the day to find positions of appointments
        routesForDay.forEach(route => {
          const routeOrder = parseRouteOrder(route.route_order);
          routeOrder.forEach((appointmentId: number, index: number) => {
            appointmentPositions.set(appointmentId, index + 1); // 1-based position
          });
        });
        
        // Create patient markers for all appointments (HB, TK, and NA) on this day
        for (const appointment of appointmentsForDay) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
            const position = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
            const patientMarkerData = createPatientMarkerData(patient, appointment, position);
            if (patientMarkerData) newMarkers.push(patientMarkerData);
          }
        }
      }
      
      // Set markers
      setMarkers(newMarkers);
      
    } catch (err) {
      console.error('Error creating markers:', err);
      setError('Fehler beim Erstellen der Marker');
    } finally {
      setLoading(false);
    }
  }, [employees, patients, appointments, selectedWeekday, filteredRoutes]);
  
  // Function to refetch all data
  const refetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Clear markers to prevent stale data
      setMarkers([]);
      
      // Refetch all data using React Query's refetch functions
      await Promise.all([
        refetchEmployees(),
        refetchPatients(),
        refetchAppointments(),
        refetchRoutes()
      ]);
      
      // After refetch is complete, recreate markers
      // This will be triggered by the useEffect hooks once data is loaded
    } catch (error) {
      console.error('Error refetching data:', error);
      setError('Fehler beim Aktualisieren der Daten');
    } finally {
      setLoading(false);
    }
  }, [refetchEmployees, refetchPatients, refetchAppointments, refetchRoutes]);

  // Combined loading state
  const isLoading = loading || employeesLoading || patientsLoading || appointmentsLoading || routesLoading;
  
  // Combined error handling
  const combinedError = error || 
    (patientsError instanceof Error ? patientsError.message : null) ||
    (appointmentsError instanceof Error ? appointmentsError.message : null) ||
    (routesError instanceof Error ? routesError.message : null);

  return {
    markers,
    allRoutes,
    filteredRoutes,
    employees,
    patients,
    appointments,
    routes,
    createMarkers,
    refetchData,
    isLoading,
    error: combinedError
  };
}; 