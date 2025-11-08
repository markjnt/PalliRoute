import React, { useEffect, useState } from 'react';
import { Box, SwipeableDrawer, Button, Menu, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MapView } from './MainViewMap';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { MainBottomSheet } from './MainBottomSheet';
import UserSearchDrawer from '../user/UserSelectSheet';
import { TopOverviewBar } from './TopOverviewBar';

const MainLayout: React.FC = () => {
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { selectedWeekday, setSelectedWeekday, resetToCurrentDay } = useWeekdayStore();
  const navigate = useNavigate();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isTestSheetOpen, setIsTestSheetOpen] = useState(false);

  // Automatisch den aktuellen Tag auswählen beim Laden der App
  useEffect(() => {
    if (selectedWeekendArea) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const currentDay = days[new Date().getDay()];
      const isWeekend = currentDay === 'saturday' || currentDay === 'sunday';
      setSelectedWeekday(isWeekend && currentDay ? currentDay : 'saturday');
    } else {
      resetToCurrentDay();
    }
  }, [resetToCurrentDay, selectedWeekendArea, setSelectedWeekday]);

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
    setIsTestSheetOpen(!isTestSheetOpen);
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
        />

        <MainBottomSheet 
          isOpen={isTestSheetOpen}
          onClose={handleTestSheetClose}
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
