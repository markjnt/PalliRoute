import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries, createEmployeeMarkerData, createPatientMarkerData, parseRouteOrder, calculateRouteBounds } from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { routeLineColors, getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey
}) => {
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    language: 'de',
    region: 'DE'
  });

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Get selected user and weekday from stores
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();

  // Data hooks
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: patients = [], isLoading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [], isLoading: routesLoading, error: routesError, refetch: refetchRoutes } = useRoutes({ weekday: selectedWeekday as Weekday });

  // Routen basierend auf Sichtbarkeit filtern
  const visibleRoutes = useMemo(() => {
    // Immer nur die Route des ausgewählten Mitarbeiters anzeigen
    return routes.filter(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
  }, [routes, selectedUserId, selectedWeekday]);

  // Marker-Berechnung mit useMemo
  const markers = useMemo(() => {
    if (!isLoaded) return [];
    const newMarkers = [];
    
    // Nur der ausgewählte Mitarbeiter anzeigen
    const selectedEmployee = employees.find(e => e.id === selectedUserId);
    if (selectedEmployee && selectedEmployee.latitude && selectedEmployee.longitude) {
      const route = visibleRoutes.find(r => r.employee_id === selectedEmployee.id);
      const marker = createEmployeeMarkerData(selectedEmployee, route?.id);
      if (marker) {
        newMarkers.push({ ...marker, isInactive: false });
      }
    }
    
    // Appointments/Patients nur für die Route des ausgewählten Mitarbeiters
    if (patients.length > 0 && appointments.length > 0 && visibleRoutes.length > 0) {
      const appointmentPositions = new Map();
      
      // Positionen für alle Termine in der Route des ausgewählten Mitarbeiters setzen
      visibleRoutes.forEach(route => {
        const routeOrder = parseRouteOrder(route.route_order);
        routeOrder.forEach((appointmentId, idx) => {
          appointmentPositions.set(appointmentId, { position: idx + 1, routeId: route.id });
        });
      });
      
      // HB- und NA-Termine (Hausbesuch und Neuaufnahme) anzeigen
      const appointmentsForDay = appointments.filter(a => a.weekday === selectedWeekday && (a.visit_type === 'HB' || a.visit_type === 'NA'));
      
      for (const appointment of appointmentsForDay) {
        const patient = patients.find(p => p.id === appointment.patient_id);
        if (patient) {
          const posInfo = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
          const position = posInfo ? posInfo.position : undefined;
          const routeId = posInfo ? posInfo.routeId : undefined;
          
          if (routeId) {
            // Prüfe, ob der Termin zur Route des ausgewählten Mitarbeiters gehört
            const route = visibleRoutes.find(r => r.id === routeId);
            if (route && route.employee_id === selectedUserId) {
              const baseMarker = createPatientMarkerData(patient, appointment, position, routeId);
              if (baseMarker) {
                newMarkers.push({ ...baseMarker, isInactive: false });
              }
            }
          }
        }
      }
    }
    
    return newMarkers;
  }, [isLoaded, employees, patients, appointments, visibleRoutes, selectedWeekday, selectedUserId]);

  // Route-Polylines für alle sichtbaren Routen
  const routePaths = useMemo(() => {
    return visibleRoutes.map(route => {
      const employee = employees.find(e => e.id === route.employee_id);
      const color = employee?.id ? getColorForTour(employee.id) : '#9E9E9E';
      
      return {
        employeeId: route.employee_id,
        routeId: route.id,
        routeOrder: parseRouteOrder(route.route_order),
        color,
        polyline: route.polyline,
        totalDistance: route.total_distance || 0,
        totalDuration: route.total_duration || 0,
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee'
      };
    });
  }, [visibleRoutes, employees]);

  // Auto-center map on route when routes change
  useEffect(() => {
    if (map && visibleRoutes.length > 0 && employees.length > 0 && patients.length > 0 && appointments.length > 0) {
      const bounds = calculateRouteBounds(visibleRoutes, employees, patients, appointments);
      if (bounds) {
        // Add some padding around the bounds for better visibility
        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50
        });
      }
    }
  }, [map, visibleRoutes, employees, patients, appointments]);

  // Fehler- und Ladezustände
  const isLoading = employeesLoading || patientsLoading || appointmentsLoading || routesLoading || !isLoaded;
  const error = mapError || (patientsError instanceof Error ? patientsError.message : null) || (appointmentsError instanceof Error ? appointmentsError.message : null) || (routesError instanceof Error ? routesError.message : null);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Fehler beim Laden der Daten: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        options={mapOptions}
      >
        <RoutePolylines routes={routePaths} map={map} />
        <MapMarkers
          markers={markers}
          patients={patients}
          employees={employees}
          appointments={appointments}
          routes={routes}
        />
      </GoogleMap>
    </Box>
  );
};