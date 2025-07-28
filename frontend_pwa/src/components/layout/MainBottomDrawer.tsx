import React, { useState, useEffect } from 'react';
import { 
  Box, 
  SwipeableDrawer, 
  IconButton, 
  Typography,
  Avatar,
  Chip,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useEmployees } from '../../services/queries/useEmployees';
import UserSearchDrawer from '../user/UserSelectDrawer';
import { employeeTypeColors } from '../../utils/colors';
import { WeekdayCalendar } from '../route/WeekdayCalendar';

/**
 * Main Bottom Drawer component that shows user information and allows user switching
 */
export const MainBottomDrawer: React.FC = () => {
  const { selectedUserId, setSelectedUser } = useUserStore();
  const { data: employees = [] } = useEmployees();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  const selectedEmployee = employees.find(emp => emp.id === selectedUserId);

  // Auto-select first employee and open drawer if no user is selected
  useEffect(() => {
    if (!selectedUserId && employees.length > 0) {
      setSelectedUser(employees[0].id as number);
      setIsUserDrawerOpen(true);
    }
  }, [selectedUserId, employees.length, setSelectedUser]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEmployeeColor = (employeeFunction: string) => {
    return employeeTypeColors[employeeFunction] || employeeTypeColors.default;
  };

  return (
    <>
      {/* Always visible swipeable drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={true}
        onClose={() => {}}
        onOpen={() => {}}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            height: 'auto',
            maxHeight: '50vh',
            minHeight: '200px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.12)',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
        }}
      >
        {/* Drag handle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 1,
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 2,
            }}
          />
        </Box>

        {/* Weekday Calendar - moved to top */}
        <Box sx={{ px: 2, pb: 2 }}>
          <WeekdayCalendar />
        </Box>

        {/* Divider */}
        <Divider sx={{ mx: 3, mb: 2 }} />

        {/* User info and switch button */}
        <Box sx={{ px: 3, pb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {selectedEmployee ? (
                <>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: '#007AFF',
                      color: 'white',
                      mr: 2,
                      fontSize: '1.4rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                    }}
                  >
                    {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: '#1d1d1f',
                        mb: 0.5,
                      }}
                    >
                      {`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                    </Typography>
                    {selectedEmployee.function && (
                      <Chip
                        label={selectedEmployee.function}
                        size="small"
                        sx={{
                          bgcolor: getEmployeeColor(selectedEmployee.function),
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          height: 20,
                          '& .MuiChip-label': {
                            px: 1,
                          },
                        }}
                      />
                    )}
                  </Box>
                </>
              ) : (
                <>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: '#f0f0f0',
                      color: '#666',
                      mr: 2,
                      fontSize: '1.4rem',
                      fontWeight: 600,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: '#1d1d1f',
                        mb: 0.5,
                      }}
                    >
                      Kein Mitarbeiter ausgewählt
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#666',
                      }}
                    >
                      Wählen Sie einen Mitarbeiter aus
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
            
            <IconButton
              onClick={() => setIsUserDrawerOpen(true)}
              sx={{
                bgcolor: '#007AFF',
                color: 'white',
                width: 48,
                height: 48,
                '&:hover': {
                  bgcolor: '#0056CC',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
              }}
            >
              <SwapHorizIcon />
            </IconButton>
          </Box>
        </Box>
      </SwipeableDrawer>

      {/* User selection drawer */}
      <UserSearchDrawer
        open={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
      />
    </>
  );
}; 