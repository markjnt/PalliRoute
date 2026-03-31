import React, { useEffect, useState, useRef } from 'react';
import { Box, SwipeableDrawer, Button, Menu, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MapView } from './MainViewMap';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { MainBottomSheet } from './MainBottomSheet';
import UserSearchDrawer from '../user/UserSelectSheet';
import { TopOverviewBar } from './TopOverviewBar';

const MainLayout: React.FC = () => {
  const { selectedUserId, selectedTourArea } = useUserStore();
  const { selectedWeekday, setSelectedWeekday, resetToCurrentDay } = useWeekdayStore();
  const navigate = useNavigate();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Verfolge die vorherige Tour-Art, um zu erkennen, ob zwischen Tour-Arten gewechselt wurde
  const previousTourTypeRef = useRef<'employee' | 'tour_area' | null>(null);
  const isInitialMountRef = useRef(true);

  // Automatisch den aktuellen Tag auswählen beim Laden der App oder beim Wechsel zwischen Tour-Arten
  useEffect(() => {
    // Bestimme die aktuelle Tour-Art
    const currentTourType: 'employee' | 'tour_area' | null = 
      selectedTourArea ? 'tour_area' : (selectedUserId ? 'employee' : null);

    // Beim ersten Laden oder wenn zwischen Tour-Arten gewechselt wird
    const isTourTypeChange = previousTourTypeRef.current !== null && 
                             previousTourTypeRef.current !== currentTourType;
    
    if (isInitialMountRef.current || isTourTypeChange) {
      if (selectedTourArea) {
        // AW-Tour: aktueller Sa/So oder Samstag als Fallback
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
        const currentDay = days[new Date().getDay()];
        const isAreaDay = currentDay === 'saturday' || currentDay === 'sunday';
        setSelectedWeekday(isAreaDay && currentDay ? currentDay : 'saturday');
      } else if (selectedUserId) {
        // Mitarbeiter-Tour: Setze auf aktuellen Werktag oder Montag als Fallback
        resetToCurrentDay();
      }
    }

    // Aktualisiere die vorherige Tour-Art
    previousTourTypeRef.current = currentTourType;
    isInitialMountRef.current = false;
  }, [selectedUserId, selectedTourArea, setSelectedWeekday, resetToCurrentDay]);

  // Redirect to user selection if no user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setIsUserDrawerOpen(true);
    }
  }, [selectedUserId]);

  const handleUserSwitch = () => {
    const nextIsUserDrawerOpen = !isUserDrawerOpen;

    // Wenn der User-Selector geöffnet wird, MainBottomSheet schließen
    if (nextIsUserDrawerOpen) {
      setIsSheetOpen(false);
    }

    setIsUserDrawerOpen(nextIsUserDrawerOpen);
  };

  const handleDrawerClose = () => {
    setIsUserDrawerOpen(false);
  };

  const handleSheetToggle = () => {
    if (!isSheetOpen) {
      setIsUserDrawerOpen(false); // User-Sheet schließen beim Öffnen des MainBottomSheet
    }
    setIsSheetOpen(!isSheetOpen);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setIsUserDrawerOpen(false); // Also close user select sheet when map/outside is clicked
    // Also close weekday selector when map is clicked
    if ((window as any).__closeWeekdaySelector) {
      (window as any).__closeWeekdaySelector();
    }
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
        <MapView onMapClick={handleSheetClose} />
        
        {/* Top Overview Bar */}
        <TopOverviewBar 
          onUserSwitch={handleUserSwitch}
          onSheetToggle={handleSheetToggle}
          onCloseWeekdaySelector={() => {}}
          onWeekdayButtonClick={() => {
            setIsSheetOpen(false);
            setIsUserDrawerOpen(false);
          }}
        />

        <MainBottomSheet 
          isOpen={isSheetOpen}
          onClose={handleSheetClose}
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
