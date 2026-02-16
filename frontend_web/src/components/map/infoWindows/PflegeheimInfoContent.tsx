import React from 'react';
import { Box, Typography } from '@mui/material';
import { MarkerData } from '../../../types/mapTypes';
import { Business as BusinessIcon } from '@mui/icons-material';

interface PflegeheimInfoContentProps {
  marker: MarkerData;
}

/**
 * Component for displaying Pflegeheim marker information in info windows
 */
export const PflegeheimInfoContent: React.FC<PflegeheimInfoContentProps> = ({ marker }) => {
  const name = marker.title;
  const address = marker.customAddress;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <BusinessIcon sx={{ color: '#388e3c', fontSize: 20 }} />
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
