import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useWeekdayStore } from '../../stores';
import { configApi } from '../../services/api/config';
import { MapContainer } from './MapContainer';

/**
 * Main Map View component that manages API key fetching and shows the map
 */
export const MapView: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const { selectedWeekday } = useWeekdayStore();

  // Fetch Google Maps API key on component mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const key = await configApi.getGoogleMapsApiKey();
        setApiKey(key);
      } catch (err) {
        setError('Fehler beim Laden des API-Schlüssels');
        console.error('Error fetching API key:', err);
      }
    };
    fetchApiKey();
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!apiKey) {
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

  return <MapContainer apiKey={apiKey} selectedWeekday={selectedWeekday} />;
}; 