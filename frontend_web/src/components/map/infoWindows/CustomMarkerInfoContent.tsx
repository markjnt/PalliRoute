import React from 'react';
import { Box, Typography } from '@mui/material';
import { MarkerData } from '../../../types/mapTypes';
import { Place as PlaceIcon } from '@mui/icons-material';

interface CustomMarkerInfoContentProps {
  marker: MarkerData;
}

/**
 * Component for displaying custom user-added marker information in info windows
 */
export const CustomMarkerInfoContent: React.FC<CustomMarkerInfoContentProps> = ({ marker }) => {
  const name = marker.title;
  const address = marker.customAddress;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <PlaceIcon sx={{ color: '#ff5722', fontSize: 20 }} />
        <Typography variant="subtitle1" component="div" sx={{ 
          fontWeight: 'bold',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 0.5,
        }}>
          {name}
        </Typography>
      </Box>
      {address && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {address}
        </Typography>
      )}
    </>
  );
};
