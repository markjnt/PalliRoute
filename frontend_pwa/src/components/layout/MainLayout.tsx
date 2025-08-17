import React, { useEffect, useState } from 'react';
import { Box, IconButton, SwipeableDrawer, Button, Menu, MenuItem, Typography } from '@mui/material';
import { Person as PersonIcon, Menu as MenuIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { MapView } from './MainViewMap';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { MainBottomSheet } from './MainBottomSheet';
import UserSearchDrawer from '../user/UserSelectSheet';

const MainLayout: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
  const navigate = useNavigate();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isWeekdayMenuOpen, setIsWeekdayMenuOpen] = useState(false);
  const [weekdayMenuAnchor, setWeekdayMenuAnchor] = useState<null | HTMLElement>(null);

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

  const handleBottomSheetToggle = () => {
    setIsBottomSheetOpen(!isBottomSheetOpen);
  };

  const handleBottomSheetClose = () => {
    setIsBottomSheetOpen(false);
  };

  const handleWeekdayButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setWeekdayMenuAnchor(event.currentTarget);
    setIsWeekdayMenuOpen(true);
  };

  const handleWeekdayMenuClose = () => {
    setIsWeekdayMenuOpen(false);
    setWeekdayMenuAnchor(null);
  };

  const handleWeekdaySelect = (weekday: string) => {
    setSelectedWeekday(weekday as any);
    handleWeekdayMenuClose();
  };

  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      'monday': 'Mo',
      'tuesday': 'Di',
      'wednesday': 'Mi',
      'thursday': 'Do',
      'friday': 'Fr'
    };
    return weekdayMap[weekday] || weekday;
  };

  const weekdays = [
    { value: 'monday', label: 'Montag' },
    { value: 'tuesday', label: 'Dienstag' },
    { value: 'wednesday', label: 'Mittwoch' },
    { value: 'thursday', label: 'Donnerstag' },
    { value: 'friday', label: 'Freitag' }
  ];

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
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView />
        
        {/* Apple-design weekday selection button - bottom left */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={handleWeekdayButtonClick}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
              color: '#007AFF',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.05)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)',
              },
              '&:active': {
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                transform: 'scale(1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                fontSize: '1rem',
                lineHeight: 1,
              }}
            >
              {getGermanWeekday(selectedWeekday)}
            </Typography>
          </IconButton>
        </Box>

        {/* Apple-design floating button - bottom right */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={handleBottomSheetToggle}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
              color: '#007AFF',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.05)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <MenuIcon sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>

        {/* Weekday selection menu */}
        <Menu
          anchorEl={weekdayMenuAnchor}
          open={isWeekdayMenuOpen}
          onClose={handleWeekdayMenuClose}
          PaperProps={{
            sx: {
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
              mb: 1,
              minWidth: 56,
              maxWidth: 56,
            }
          }}
          transformOrigin={{ horizontal: 'center', vertical: 'bottom' }}
          anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
        >
          {weekdays.map((weekday) => (
            <MenuItem
              key={weekday.value}
              onClick={() => handleWeekdaySelect(weekday.value)}
              sx={{
                py: 1,
                px: 0,
                minHeight: 'auto',
                justifyContent: 'center',
                color: selectedWeekday === weekday.value ? '#007AFF' : '#1d1d1f',
                fontWeight: selectedWeekday === weekday.value ? 600 : 400,
                fontSize: '1rem',
                '&:hover': {
                  bgcolor: 'transparent',
                },
                '&:active': {
                  bgcolor: 'transparent',
                }
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 'inherit' }}>
                {getGermanWeekday(weekday.value)}
              </Typography>
            </MenuItem>
          ))}
        </Menu>

        <MainBottomSheet 
          open={isBottomSheetOpen}
          onClose={handleBottomSheetClose}
          onUserSwitch={handleUserSwitch} 
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
