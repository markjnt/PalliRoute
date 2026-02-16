import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button, IconButton } from '@mui/material';
import { Event as EventIcon, AddLocation as AddLocationIcon, Delete as DeleteIcon, Business as BusinessIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps, MarkerData } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries, createEmployeeMarkerData, createPatientMarkerData, createWeekendAreaMarkerData, createWeekendPatientMarkerData, parseRouteOrder } from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { AddCustomMarkerDialog } from './AddCustomMarkerDialog';
import { PflegeheimeDialog } from './PflegeheimeDialog';
import { routeLineColors, getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';
import AreaSelection from '../area_select/AreaSelection';
import { useCustomMarkerStore } from '../../stores/useCustomMarkerStore';
import { usePflegeheime } from '../../services/queries/usePflegeheime';
import { usePflegeheimeVisibilityStore } from '../../stores/usePflegeheimeVisibilityStore';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  selectedWeekday,
  userArea
}) => {
  const navigate = useNavigate();
  const customMarker = useCustomMarkerStore((s) => s.marker);
  const setCustomMarker = useCustomMarkerStore((s) => s.setMarker);
  const clearCustomMarker = useCustomMarkerStore((s) => s.clearMarker);
  const [addMarkerDialogOpen, setAddMarkerDialogOpen] = useState(false);
  const [pflegeheimeDialogOpen, setPflegeheimeDialogOpen] = useState(false);
  const { data: pflegeheime = [] } = usePflegeheime();
  const showPflegeheimeOnMap = usePflegeheimeVisibilityStore((s) => s.showPflegeheimeOnMap);
  const toggleShowPflegeheimeOnMap = usePflegeheimeVisibilityStore((s) => s.toggleShowPflegeheimeOnMap);

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
  const markers = useMemo((): MarkerData[] => {
    if (!isLoaded) return [];
    const newMarkers: MarkerData[] = [];
    
    if (isWeekend) {
      // Weekend logic: Show start markers for each visible area and weekend patient markers
      
      // Get unique areas from visible routes
      const visibleAreas = new Set<string>();
      dayRoutes.forEach(route => {
        if (route.area) {
          visibleAreas.add(route.area as string);
        }
      });
      
      // If no routes but we're in weekend mode, show all areas or based on userArea
      if (visibleAreas.size === 0) {
        if (isAllAreas) {
          visibleAreas.add('Nord');
          visibleAreas.add('Mitte');
          visibleAreas.add('Süd');
        } else {
          // Always show Mitte
          visibleAreas.add('Mitte');
          // Add selected area
          if (userArea === 'Nordkreis' || userArea === 'Nord') {
            visibleAreas.add('Nord');
          } else if (userArea === 'Südkreis' || userArea === 'Süd') {
            visibleAreas.add('Süd');
          }
        }
      }
      
      // Create weekend start marker for each visible area
      visibleAreas.forEach(area => {
        const marker = createWeekendAreaMarkerData(area);
        if (marker) newMarkers.push(marker);
      });
      
      // Create weekend patient markers
      if (patients.length > 0 && appointments.length > 0) {
        const weekendAppointments = appointments.filter(a => 
          a.weekday === selectedWeekday && 
          (a.visit_type === 'HB' || a.visit_type === 'NA') &&
          !a.employee_id // Only weekend appointments without employee assignment
        );
        
        const appointmentPositions = new Map();
        routes.forEach(route => {
          // Include all weekend routes (with or without employee_id from AW assignment)
          if (route.weekday === selectedWeekday && (route.weekday === 'saturday' || route.weekday === 'sunday')) {
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
    
    // Custom-Marker hinzufügen
    if (customMarker) {
      newMarkers.push({
        position: new google.maps.LatLng(customMarker.lat, customMarker.lng),
        title: customMarker.name,
        type: 'custom',
        customAddress: customMarker.address,
      });
    }

    // Pflegeheim-Marker (wenn Sichtbarkeit aktiv)
    if (showPflegeheimeOnMap && pflegeheime.length > 0) {
      for (const p of pflegeheime) {
        if (p.latitude != null && p.longitude != null) {
          newMarkers.push({
            position: new google.maps.LatLng(p.latitude, p.longitude),
            title: p.name,
            type: 'pflegeheim' as const,
            customAddress: p.address ?? `${p.street}, ${p.zip_code} ${p.city}`,
          });
        }
      }
    }

    return newMarkers;
  }, [isLoaded, employees, patients, appointments, routes, selectedWeekday, visibleRouteIds, isWeekend, customMarker, showPflegeheimeOnMap, pflegeheime]);

  // Route-Polylines
  const routePaths = useMemo(() => {
    return dayRoutes.map(route => {
      if (isWeekend) {
        // Weekend routes - may have employee_id from AW assignment
        const getAreaColor = (area?: string) => {
          switch (area) {
            case 'Nord': return '#1976d2';
            case 'Mitte': return '#7b1fa2';
            case 'Süd': return '#388e3c';
            default: return '#ff9800';
          }
        };
        const color = getAreaColor(route.area as string);
        const employee = employees.find(e => e.id === route.employee_id);
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name} (AW ${route.area})`
          : `Wochenend-Tour ${route.area}`;
        return {
          employeeId: route.employee_id || null,
          routeId: route.id,
          routeOrder: parseRouteOrder(route.route_order),
          color,
          polyline: route.polyline,
          totalDistance: route.total_distance || 0,
          totalDuration: route.total_duration || 0,
          employeeName
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
      {/* Area Selection und Custom-Marker Buttons - links oben */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        display: 'flex',
        gap: 1,
        alignItems: 'center',
      }}>
        <AreaSelection compact={true} />
        {customMarker ? (
          <Button
            onClick={clearCustomMarker}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              minWidth: 40,
              height: 40,
              minHeight: 40,
              px: 1.5,
              py: 1,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              color: '#ff5722',
              borderColor: 'rgba(255, 87, 34, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 87, 34, 0.15)',
                borderColor: 'rgba(255, 87, 34, 0.5)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <DeleteIcon />
          </Button>
        ) : (
          <Button
            onClick={() => setAddMarkerDialogOpen(true)}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              minWidth: 40,
              height: 40,
              minHeight: 40,
              px: 1.5,
              py: 1,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              color: '#ff5722',
              borderColor: 'rgba(255, 87, 34, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 87, 34, 0.15)',
                borderColor: 'rgba(255, 87, 34, 0.5)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <AddLocationIcon />
          </Button>
        )}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'stretch',
            borderRadius: '12px',
            border: '1px solid rgba(56, 142, 60, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            '&:hover': {
              backgroundColor: 'rgba(56, 142, 60, 0.15)',
              borderColor: 'rgba(56, 142, 60, 0.5)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          <Button
            onClick={() => setPflegeheimeDialogOpen(true)}
            variant="outlined"
            startIcon={<BusinessIcon />}
            size="small"
            sx={{
              borderRadius: 0,
              border: 'none',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              height: 40,
              minHeight: 40,
              px: 2,
              py: 1,
              color: '#388e3c',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(56, 142, 60, 0.1)',
                border: 'none',
              },
            }}
          >
            Pflegeheime
          </Button>
          <IconButton
            onClick={toggleShowPflegeheimeOnMap}
            size="small"
            title={showPflegeheimeOnMap ? 'Pflegeheime auf Karte ausblenden' : 'Pflegeheime auf Karte anzeigen'}
            sx={{
              borderRadius: 0,
              borderLeft: '1px solid rgba(56, 142, 60, 0.3)',
              color: showPflegeheimeOnMap ? '#388e3c' : 'action.active',
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: 'rgba(56, 142, 60, 0.1)',
              },
            }}
          >
            {showPflegeheimeOnMap ? <VisibilityIcon /> : <VisibilityOffIcon />}
          </IconButton>
        </Box>
      </Box>

      <AddCustomMarkerDialog
        open={addMarkerDialogOpen}
        onClose={() => setAddMarkerDialogOpen(false)}
        onSuccess={(name, address, lat, lng) => {
          setCustomMarker({ name, address, lat, lng });
          setAddMarkerDialogOpen(false);
        }}
      />

      <PflegeheimeDialog
        open={pflegeheimeDialogOpen}
        onClose={() => setPflegeheimeDialogOpen(false)}
      />

      {/* Rufbereitschaft Button - positioned absolutely over the map, top right */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
      }}>
        <Button
          onClick={() => navigate('/rbawplan')}
          variant="outlined"
          startIcon={<EventIcon />}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            px: 2,
            py: 1,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            color: '#1d1d1f',
            borderColor: 'rgba(0, 0, 0, 0.12)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(0, 0, 0, 0.2)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          RB/AW Planung
        </Button>
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