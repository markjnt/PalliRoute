import React, { useEffect, useState, useRef } from 'react';
import { Box, SwipeableDrawer, Button, Menu, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MapView } from './MainViewMap';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { MainBottomSheet, MainBottomSheetRef } from './MainBottomSheet';
import UserSearchDrawer from '../user/UserSelectSheet';
import { TopOverviewBar } from './TopOverviewBar';

const MainLayout: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday, setSelectedWeekday, resetToCurrentDay } = useWeekdayStore();
  const navigate = useNavigate();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isTestSheetOpen, setIsTestSheetOpen] = useState(false);
  const sheetRef = useRef<MainBottomSheetRef>(null);

  // Automatisch den aktuellen Tag auswählen beim Laden der App
  useEffect(() => {
    resetToCurrentDay();
  }, [resetToCurrentDay]);

  // Redirect to user selection if no user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setIsUserDrawerOpen(true);
    }
  }, [selectedUserId]);

  const handleUserSwitch = () => {
    setIsUserDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsUserDrawerOpen(false);
  };

  const handleTestSheetToggle = () => {
    if (!isTestSheetOpen) {
      // First click: open sheet
      setIsTestSheetOpen(true);
    } else if (sheetRef.current) {
      // Second or third click: cycle through states
      sheetRef.current.cycleSheetState();
    }
  };

  const handleTestSheetClose = () => {
    setIsTestSheetOpen(false);
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'fixed', // Fix position to prevent viewport issues
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView onMapClick={handleTestSheetClose} />
        
        {/* Top Overview Bar */}
        <TopOverviewBar 
          onUserSwitch={handleUserSwitch}
          onSheetToggle={handleTestSheetToggle}
          onSheetClose={handleTestSheetClose}
        />

        <MainBottomSheet 
          isOpen={isTestSheetOpen}
          onClose={handleTestSheetClose}
          ref={sheetRef}
        />

        <UserSearchDrawer
          open={isUserDrawerOpen}
          onClose={handleDrawerClose}
        />
      </Box>
    </Box>
  );
};

export default MainLayout;
