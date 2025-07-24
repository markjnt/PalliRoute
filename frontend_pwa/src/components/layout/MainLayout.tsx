import React from 'react';
import { Box } from '@mui/material';
import { MapView } from '../map/MainViewMap';

const MainLayout: React.FC = () => {
  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1 }}>
        <MapView />
      </Box>
    </Box>
  );
};

export default MainLayout;
