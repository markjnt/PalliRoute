import React from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useWeekdayStore } from '../../stores';
import { MapContainer } from './MapContainer';
import { useGoogleMapsApiKey } from '../../services/queries/useGoogleMapsApiKey';
import { useUserStore } from '../../stores/useUserStore';

/**
 * Main Map View component that manages API key fetching and shows the map
 */
export const MapView: React.FC = () => {
  const { data: apiKey, isLoading, error } = useGoogleMapsApiKey();
  const { selectedWeekday } = useWeekdayStore();
  const { currentUser } = useUserStore();
  const userArea = currentUser?.area;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Fehler beim Laden des API-Schlüssels</Alert>
      </Box>
    );
  }

  if (isLoading) {
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

  return <MapContainer apiKey={apiKey!} selectedWeekday={selectedWeekday} userArea={userArea} />;
}; 