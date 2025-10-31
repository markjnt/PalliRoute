import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries, createEmployeeMarkerData, createPatientMarkerData, createWeekendAreaMarkerData, parseRouteOrder, calculateRouteBounds } from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { FloatingRefreshButton } from './FloatingRefreshButton';
import { routeLineColors, getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  onMapClick
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
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { selectedEmployeeIds } = useAdditionalRoutesStore();

  // Data hooks
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: patients = [], isLoading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [], isLoading: routesLoading, error: routesError, refetch: refetchRoutes } = useRoutes({ weekday: selectedWeekday as Weekday });

  // Routen basierend auf Sichtbarkeit filtern
  const visibleRoutes = useMemo(() => {
    if (selectedWeekendArea) {
      // Für Wochenend-Bereiche: Hauptroute des ausgewählten Bereichs
      const mainRoute = routes.filter(route => 
        !route.employee_id && 
        route.area === selectedWeekendArea && 
        route.weekday === selectedWeekday
      );
      
      // Zusätzliche Routen der anderen Wochenend-Bereiche
      const additionalRoutes = routes.filter(route => 
        !route.employee_id && 
        selectedEmployeeIds.includes(route.area) && 
        route.weekday === selectedWeekday
      );
      
      return [...mainRoute, ...additionalRoutes];
    } else {
      // Für Mitarbeiter: Hauptroute des ausgewählten Mitarbeiters
      const mainRoute = routes.filter(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
      
      // Zusätzliche Routen der ausgewählten Mitarbeiter
      const additionalRoutes = routes.filter(route => 
        route.employee_id && selectedEmployeeIds.includes(route.employee_id) && route.weekday === selectedWeekday
      );
      
      return [...mainRoute, ...additionalRoutes];
    }
  }, [routes, selectedUserId, selectedWeekendArea, selectedWeekday, selectedEmployeeIds]);

  // Marker-Berechnung mit useMemo
  const markers = useMemo(() => {
    if (!isLoaded) return [];
    const newMarkers = [];
    
    if (selectedWeekendArea) {
      // Für Wochenend-Bereiche: Nur den zentralen Start-Marker anzeigen
      const weekendStartMarker = createWeekendAreaMarkerData(selectedWeekendArea);
      if (weekendStartMarker) {
        newMarkers.push({ ...weekendStartMarker, isInactive: false });
      }
      
      // Keine zusätzlichen Wochenend-Bereich-Marker mehr, da der zentrale orange Marker ausreicht
    } else {
      // Für Mitarbeiter: Hauptmitarbeiter anzeigen
      const selectedEmployee = employees.find(e => e.id === selectedUserId);
      if (selectedEmployee && selectedEmployee.latitude && selectedEmployee.longitude) {
        const route = visibleRoutes.find(r => r.employee_id === selectedEmployee.id);
        const marker = createEmployeeMarkerData(selectedEmployee, route?.id);
        if (marker) {
          newMarkers.push({ ...marker, isInactive: false });
        }
      }
      
      // Zusätzliche Mitarbeiter anzeigen
      selectedEmployeeIds.forEach(employeeId => {
        const employee = employees.find(e => e.id === employeeId);
        if (employee && employee.latitude && employee.longitude) {
          const route = visibleRoutes.find(r => r.employee_id === employee.id);
          const marker = createEmployeeMarkerData(employee, route?.id);
          if (marker) {
            newMarkers.push({ ...marker, isInactive: false });
          }
        }
      });
    }
    
    // Appointments/Patients für alle sichtbaren Routen
    if (patients.length > 0 && appointments.length > 0 && visibleRoutes.length > 0) {
      const appointmentPositions = new Map();
      
      // Positionen für alle Termine in allen sichtbaren Routen setzen
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
            // Prüfe, ob der Termin zu einer sichtbaren Route gehört
            const route = visibleRoutes.find(r => r.id === routeId);
            if (route) {
              const baseMarker = createPatientMarkerData(patient, appointment, position, routeId, route);
              if (baseMarker) {
                newMarkers.push({ ...baseMarker, isInactive: false });
              }
            }
          }
        }
      }
    }
    
    return newMarkers;
  }, [isLoaded, employees, patients, appointments, visibleRoutes, selectedWeekday, selectedUserId, selectedEmployeeIds]);

  // Route-Polylines für alle sichtbaren Routen
  const routePaths = useMemo(() => {
    return visibleRoutes.map(route => {
      if (selectedWeekendArea) {
        // Für Wochenend-Routen: Verwende die gleichen Farben wie bei Mitarbeitern
        const getWeekendAreaColor = (area: string) => {
          switch (area) {
            case 'Nord': return '#1976d2'; // Blue
            case 'Mitte': return '#7b1fa2'; // Purple
            case 'Süd': return '#388e3c'; // Green
            default: return '#ff9800'; // Orange fallback
          }
        };
        
        // Hauptroute (ausgewählter Bereich) bekommt die Standard-Blaue Farbe
        const isMainRoute = route.area === selectedWeekendArea;
        const color = isMainRoute ? '#2196F3' : getWeekendAreaColor(route.area);
        
        return {
          employeeId: null, // Weekend routes have no employee
          routeId: route.id,
          routeOrder: parseRouteOrder(route.route_order),
          color,
          polyline: route.polyline,
          totalDistance: route.total_distance || 0,
          totalDuration: route.total_duration || 0,
          employeeName: `AW ${route.area}`
        };
      } else {
        // Für Mitarbeiter-Routen: Bestehende Logik
        const employee = employees.find(e => e.id === route.employee_id);
        const isMainRoute = route.employee_id === selectedUserId;
        const color = isMainRoute ? '#2196F3' : (employee?.id ? getColorForTour(employee.id) : '#9E9E9E');
        
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
      }
    });
  }, [visibleRoutes, employees, selectedWeekendArea, selectedUserId]);

  // Auto-center map on route when routes change
  useEffect(() => {
    if (map && employees.length > 0 && patients.length > 0 && appointments.length > 0) {
      // For weekend areas, we need to zoom even if no routes are present
      const shouldZoom = visibleRoutes.length > 0 || selectedWeekendArea;
      
      if (shouldZoom) {
        const bounds = calculateRouteBounds(visibleRoutes, employees, patients, appointments, selectedWeekendArea);
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
    }
  }, [map, visibleRoutes, employees, patients, appointments, selectedWeekendArea]);

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
        onClick={onMapClick}
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
      
      {/* Floating Refresh Button */}
      <FloatingRefreshButton />
    </Box>
  );
};