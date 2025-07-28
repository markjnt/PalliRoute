import React, { useEffect, useState } from 'react';
import { Box, IconButton, SwipeableDrawer, Button } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { MapView } from './MainViewMap';
import { useUserStore } from '../../stores/useUserStore';
import UserSearchDrawer from '../user/UserSelectDrawer';

const MainLayout: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Redirect to user selection if no user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setDrawerOpen(true);
    }
  }, [selectedUserId]);

  const handleUserSwitch = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // Prevent scrolling outside viewport
      position: 'fixed', // Fix position to prevent viewport issues
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MapView />
      </Box>
    </Box>
  );
};

export default MainLayout;
