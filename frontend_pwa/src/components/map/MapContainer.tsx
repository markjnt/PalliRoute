import React from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Box, CircularProgress } from '@mui/material';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 51.0281,
  lng: 7.5653
};

const defaultZoom = 10;

// Map options to remove all controls for mobile optimization
const mapOptions = {
  disableDefaultUI: true, // Removes all default UI controls
  zoomControl: false, // Removes zoom controls
  mapTypeControl: false, // Removes map type controls (satellite, terrain, etc.)
  streetViewControl: false, // Removes street view control
  fullscreenControl: false, // Removes fullscreen control
  gestureHandling: 'greedy', // Allows single finger pan and zoom
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }] // Hides points of interest labels
    }
  ]
};

export interface MapContainerProps {
  apiKey: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({ apiKey }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    language: 'de',
    region: 'DE'
  });

  if (!isLoaded) {
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
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={defaultZoom}
      options={mapOptions}
    />
  );
};