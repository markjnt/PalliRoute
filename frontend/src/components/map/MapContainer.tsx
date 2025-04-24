import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, CircularProgress, Alert, Button, Typography } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import { containerStyle, defaultCenter, defaultZoom, mapOptions, libraries } from '../../utils/mapUtils';
import { useMapData } from '../../hooks/useMapData';
import { useRouteCalculator } from '../../hooks/useRouteCalculator';
import { useMarkerGroups } from '../../hooks/useMarkerGroups';
import { MapMarkers } from './MapMarkers';
import { RouteDirections } from './RouteDirections';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  selectedWeekday
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    language: 'de',
    region: 'DE'
  });

  // State for Google Map
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Ref für die Verfolgung von Änderungen in der Routenreihenfolge
  const routeOrderRef = useRef<string | null>(null);
  
  // Use custom hooks for data management - React Query handles caching and updates
  const {
    markers,
    filteredRoutes,
    employees,
    patients,
    appointments,
    createMarkers,
    refetchData,
    isLoading,
    error: dataError
  } = useMapData(selectedWeekday);
  
  const {
    routePaths,
    calculateRoutes,
    isCalculating
  } = useRouteCalculator(
    map, 
    markers, 
    filteredRoutes, 
    appointments, 
    employees, 
    selectedWeekday
  );
  
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
  
  // Map load callback - only run once when map loads
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Create a custom style for the map markers with position numbers
    const customLabelStyle = document.createElement('style');
    customLabelStyle.textContent = `
      .gm-style .gm-style-iw {
        font-weight: bold;
      }
      .gm-style-mtvbg {
        color: white !important;
        font-weight: bold !important;
        font-family: Arial, sans-serif !important;
      }
    `;
    document.head.appendChild(customLabelStyle);
    
    // When map is ready, initialize data
    if (markers.length === 0) {
      createMarkers();
    }
    
    // Calculate routes if needed (only if we have markers and routes, but no directions yet)
    if (markers.length > 0 && filteredRoutes.length > 0 && (!routePaths || routePaths.length === 0)) {
      calculateRoutes();
    }
  }, [createMarkers, calculateRoutes, markers.length, filteredRoutes.length, routePaths]);

  // Explizit die Routenberechnung auslösen, wenn Map bereit ist und Daten verfügbar sind
  useEffect(() => {
    if (map && markers.length > 0 && filteredRoutes.length > 0 && (!routePaths || routePaths.length === 0)) {
      console.log('Triggering route calculation from useEffect');
      calculateRoutes();
    }
  }, [map, markers, filteredRoutes, routePaths, calculateRoutes, selectedWeekday]);

  // Reagiere auf Änderungen in den filteredRoutes (z.B. wenn ein Patient verschoben wurde)
  useEffect(() => {
    // Nur neu berechnen, wenn sich die Reihenfolge geändert hat
    if (map && markers.length > 0 && filteredRoutes.length > 0) {
      // Serialisiere die Routen-Reihenfolge für den Vergleich
      const routeOrderString = JSON.stringify(
        filteredRoutes.map(route => ({ id: route.id, order: route.route_order }))
      );
      
      // Nur neu berechnen, wenn sich die Reihenfolge geändert hat
      if (routeOrderString !== routeOrderRef.current) {
        console.log('Routes changed, recalculating directions');
        routeOrderRef.current = routeOrderString;
        calculateRoutes();
      }
    }
  }, [filteredRoutes, map, markers, calculateRoutes]);
  
  // Map unmount callback
  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);
  
  // Manual recalculation handler
  const handleRecalculate = useCallback(() => {
    refetchData();
    // After data is refreshed, markers will be created and routes calculated via React Query
  }, [refetchData]);
  
  // Combined error handling
  const combinedError = mapError || dataError;
  
  // Error handling
  if (combinedError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{combinedError}</Alert>
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

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Loading overlay */}
      {isCalculating && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Error display */}
      {mapError && (
        <Box sx={{ p: 2 }}>
          <Typography color="error">{mapError}</Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 1 }} 
            onClick={handleRecalculate}
          >
            Erneut versuchen
          </Button>
        </Box>
      )}
      
      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Route Directions */}
        <RouteDirections 
          routePaths={routePaths} 
          selectedWeekday={selectedWeekday} 
        />
        
        {/* Map Markers */}
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