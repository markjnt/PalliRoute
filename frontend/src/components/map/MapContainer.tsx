import React, { useState, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries } from '../../utils/mapUtils';
import { useMapData } from '../../hooks/useMapData';
import { useMarkerGroups } from '../../hooks/useMarkerGroups';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { routeLineColors } from '../../utils/colors';
import { parseRouteOrder } from '../../utils/mapUtils';

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
  
  // Data hooks
  const {
    markers,
    filteredRoutes,
    employees,
    patients,
    appointments,
    refetchData,
    isLoading,
    error: dataError
  } = useMapData(selectedWeekday);
  
  // Process routes to create route paths
  const routePaths = useMemo(() => {
    return filteredRoutes.map(route => {
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
  }, [filteredRoutes, employees]);
  
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
  
  // Memoize map callbacks
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);
  
  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);
  
  const handleRecalculate = useCallback(() => {
    refetchData();
  }, [refetchData]);
  
  // Memoize error state
  const error = useMemo(() => mapError || dataError, [mapError, dataError]);
  
  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }} 
          onClick={handleRecalculate}
        >
          Erneut versuchen
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
    }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
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