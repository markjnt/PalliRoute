import React, { useState, useCallback, useMemo } from 'react';
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
  
  // Memoize map callbacks
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Add custom styles for map markers
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