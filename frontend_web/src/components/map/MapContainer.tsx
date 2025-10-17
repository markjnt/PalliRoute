import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries, createEmployeeMarkerData, createPatientMarkerData, createWeekendAreaMarkerData, createWeekendPatientMarkerData, parseRouteOrder } from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { routeLineColors, getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';
import AreaSelection from '../area_select/AreaSelection';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  selectedWeekday,
  userArea
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

  // Check if this is a weekend day
  const isWeekend = selectedWeekday === 'saturday' || selectedWeekday === 'sunday';

  // Data hooks - verwenden automatisch selectedCalendarWeek aus dem Store
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: patients = [], isLoading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [], isLoading: routesLoading, error: routesError, refetch: refetchRoutes } = useRoutes({ 
    weekday: selectedWeekday as Weekday,
    weekend_only: isWeekend
  });

  // Nur die passenden Routen für den Tag und die Area
  const isAllAreas = userArea === 'Nord- und Südkreis' || !userArea;
  const dayRoutes = useMemo(
    () => {
      if (isWeekend) {
        // Weekend routes - always show Mitte and filter others based on userArea
        return routes.filter(route => {
          if (route.weekday !== selectedWeekday) return false;
          if (isAllAreas) return true;
          // Always show Mitte
          if ((route.area as string) === 'Mitte') return true;
          // Filter others based on userArea - handle both "Nordkreis"/"Nord" and "Südkreis"/"Süd"
          if (userArea === 'Nordkreis' || userArea === 'Nord') return (route.area as string) === 'Nord';
          if (userArea === 'Südkreis' || userArea === 'Süd') return (route.area as string) === 'Süd';
          return false;
        });
      } else {
        // Weekday routes - handle both "Nordkreis"/"Nord" and "Südkreis"/"Süd"
        let targetArea = userArea;
        if (userArea === 'Nord') {
          targetArea = 'Nordkreis';
        } else if (userArea === 'Süd') {
          targetArea = 'Südkreis';
        }
        return routes.filter(route => route.weekday === selectedWeekday && (isAllAreas || route.area === targetArea));
      }
    },
    [routes, selectedWeekday, userArea, isAllAreas, isWeekend]
  );

  // Sichtbare Routen-IDs für den Tag
  const visibleRouteIds = dayRoutes.map(r => r.id);

  // Marker-Berechnung mit useMemo
  const markers = useMemo(() => {
    if (!isLoaded) return [];
    const newMarkers = [];
    
    if (isWeekend) {
      // Weekend logic: Show only one central weekend start marker and weekend patient markers
      
      // Always create single weekend start marker (for all three areas) - similar to employee markers
      const marker = createWeekendAreaMarkerData('Wochenend-Touren');
      if (marker) newMarkers.push(marker);
      
      // Create weekend patient markers
      if (patients.length > 0 && appointments.length > 0) {
        const weekendAppointments = appointments.filter(a => 
          a.weekday === selectedWeekday && 
          (a.visit_type === 'HB' || a.visit_type === 'NA') &&
          !a.employee_id // Only weekend appointments without employee assignment
        );
        
        const appointmentPositions = new Map();
        routes.forEach(route => {
          if (route.weekday === selectedWeekday && !route.employee_id) {
            const routeOrder = parseRouteOrder(route.route_order);
            routeOrder.forEach((appointmentId, idx) => {
              appointmentPositions.set(appointmentId, { position: idx + 1, routeId: route.id, area: route.area });
            });
          }
        });
        
        for (const appointment of weekendAppointments) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
            const posInfo = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
            const position = posInfo ? posInfo.position : undefined;
            const routeId = posInfo ? posInfo.routeId : undefined;
            const area = posInfo ? posInfo.area : appointment.area;
            
            // Prüfe, ob die Route sichtbar ist
            const isInactive = !routeId || !visibleRouteIds.includes(routeId);
            const baseMarker = createWeekendPatientMarkerData(patient, appointment, area || 'Unknown', position, routeId);
            if (baseMarker) {
              const marker = { ...baseMarker, isInactive };
              newMarkers.push(marker);
            }
          }
        }
      }
    } else {
      // Weekday logic: Show employees and regular patient markers
      // Alle Mitarbeiter mit Koordinaten als Marker anzeigen
      for (const employee of employees) {
        if (employee.latitude && employee.longitude) {
          // Finde ggf. die Route für diesen Mitarbeiter am ausgewählten Tag
          const route = routes.find(r => r.employee_id === employee.id && r.weekday === selectedWeekday);
          const marker = createEmployeeMarkerData(employee, route?.id);
          if (marker) newMarkers.push(marker);
        }
      }
      
      // Appointments/Patients
      if (patients.length > 0 && appointments.length > 0) {
        // Nur HB- und NA-Termine (Hausbesuch und Neuaufnahme)
        const appointmentsForDay = appointments.filter(a => a.weekday === selectedWeekday && (a.visit_type === 'HB' || a.visit_type === 'NA'));
        const appointmentPositions = new Map();
        routes.forEach(route => {
          const routeOrder = parseRouteOrder(route.route_order);
          routeOrder.forEach((appointmentId, idx) => {
            appointmentPositions.set(appointmentId, { position: idx + 1, routeId: route.id });
          });
        });
        for (const appointment of appointmentsForDay) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
            const posInfo = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
            const position = posInfo ? posInfo.position : undefined;
            const routeId = posInfo ? posInfo.routeId : undefined;
            // Prüfe, ob die Route sichtbar ist
            const isInactive = !routeId || !visibleRouteIds.includes(routeId);
            const baseMarker = createPatientMarkerData(patient, appointment, position, routeId);
            if (baseMarker) {
              // Area der zugehörigen Route ermitteln
              const routeArea = routeId ? routes.find(r => r.id === routeId)?.area : undefined;
              const marker = { ...baseMarker, isInactive, routeArea };
              newMarkers.push(marker);
            }
          }
        }
      }
    }
    
    return newMarkers;
  }, [isLoaded, employees, patients, appointments, routes, selectedWeekday, visibleRouteIds, isWeekend]);

  // Route-Polylines
  const routePaths = useMemo(() => {
    return dayRoutes.map(route => {
      if (isWeekend) {
        // Weekend routes - no employee, use area-based color
        const getAreaColor = (area?: string) => {
          switch (area) {
            case 'Nord': return '#1976d2';
            case 'Mitte': return '#7b1fa2';
            case 'Süd': return '#388e3c';
            default: return '#ff9800';
          }
        };
        const color = getAreaColor(route.area as string);
        return {
          employeeId: null,
          routeId: route.id,
          routeOrder: parseRouteOrder(route.route_order),
          color,
          polyline: route.polyline,
          totalDistance: route.total_distance || 0,
          totalDuration: route.total_duration || 0,
          employeeName: `Wochenend-Tour ${route.area}`
        };
      } else {
        // Weekday routes - employee-based
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
      }
    });
  }, [dayRoutes, employees, isWeekend]);

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
      {/* Area Selection Button - positioned absolutely over the map */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
      }}>
        <AreaSelection compact={true} />
      </Box>

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
          userArea={userArea}
          routes={routes}
        />
      </GoogleMap>
    </Box>
  );
};