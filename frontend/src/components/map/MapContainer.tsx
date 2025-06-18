import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries, createEmployeeMarkerData, createPatientMarkerData, parseRouteOrder } from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { useMarkerGroups } from '../../hooks/useMarkerGroups';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { routeLineColors } from '../../utils/colors';
import { MarkerData } from '../../types/mapTypes';
import { Weekday } from '../../types/models';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  selectedWeekday
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
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  // Data hooks
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: patients = [], isLoading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [], isLoading: routesLoading, error: routesError, refetch: refetchRoutes } = useRoutes({ weekday: selectedWeekday as Weekday });

  // Marker-Erstellung direkt in der Komponente
  useEffect(() => {
    if (!isLoaded) return;
    const newMarkers = [];
    // Employees
    for (const employee of employees) {
      const marker = createEmployeeMarkerData(employee);
      if (marker) newMarkers.push(marker);
    }
    // Appointments/Patients
    if (patients.length > 0 && appointments.length > 0) {
      const appointmentsForDay = appointments.filter(a => a.weekday === selectedWeekday && a.visit_type && a.visit_type.trim() !== '');
      const appointmentPositions = new Map();
      routes.forEach(route => {
        const routeOrder = parseRouteOrder(route.route_order);
        routeOrder.forEach((appointmentId, idx) => {
          appointmentPositions.set(appointmentId, idx + 1);
        });
      });
      for (const appointment of appointmentsForDay) {
        const patient = patients.find(p => p.id === appointment.patient_id);
        if (patient) {
          const position = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
          const marker = createPatientMarkerData(patient, appointment, position);
          if (marker) newMarkers.push(marker);
        }
      }
    }
    setMarkers(newMarkers);
  }, [isLoaded, employees, patients, appointments, routes, selectedWeekday]);

  // Nur die passenden Routen für den Tag
  const dayRoutes = useMemo(() => routes.filter(route => route.weekday === selectedWeekday), [routes, selectedWeekday]);

  // Route-Polylines
  const routePaths = useMemo(() => {
    return dayRoutes.map(route => {
      const employee = employees.find(e => e.id === route.employee_id);
      const tourNumber = employee?.tour_number;
      const color = tourNumber ? routeLineColors[(Math.abs(tourNumber) - 1) % routeLineColors.length] : '#9E9E9E';
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
  }, [dayRoutes, employees]);

  // Marker-Gruppen
  const {
    markerGroups,
    activeGroup,
    selectedMarker,
    isGroupActive,
    handleMarkerClick,
    handleExpandedMarkerClick,
    handleInfoWindowClose,
    handleMapClick
  } = useMarkerGroups(markers);

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
        <RoutePolylines routes={routePaths} />
        <MapMarkers 
          markerGroups={markerGroups}
          activeGroup={activeGroup}
          selectedMarker={selectedMarker}
          isGroupActive={isGroupActive}
          handleMarkerClick={handleMarkerClick}
          handleExpandedMarkerClick={handleExpandedMarkerClick}
          handleInfoWindowClose={handleInfoWindowClose}
          handleMapClick={handleMapClick}
          patients={patients}
          employees={employees}
          appointments={appointments}
        />
      </GoogleMap>
    </Box>
  );
};