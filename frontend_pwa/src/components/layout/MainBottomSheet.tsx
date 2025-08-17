import React, { useState, useEffect } from 'react';
import { Box, Typography, Divider, Avatar, Chip } from '@mui/material';
import { PersonOutline as PersonOutlineIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { Sheet } from 'react-modal-sheet';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import { WeekdayCalendar } from '../route/WeekdayCalendar';
import { RouteInfo } from '../route/RouteInfo';
import { RouteList } from '../route/RouteList';
import { employeeTypeColors } from '../../utils/colors';

interface MainBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onUserSwitch: () => void;
}

export function MainBottomSheet({ open, onClose, onUserSwitch }: MainBottomSheetProps) {
  const { selectedUserId, setSelectedUser } = useUserStore();
  const { data: employees = [] } = useEmployees();

  const selectedEmployee = employees.find(emp => emp.id === selectedUserId);

  // Auto-select first employee if no user is selected
  useEffect(() => {
    if (!selectedUserId && employees.length > 0) {
      setSelectedUser(employees[0].id as number);
    }
  }, [selectedUserId, employees.length, setSelectedUser]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEmployeeColor = (employeeFunction: string) => {
    return employeeTypeColors[employeeFunction] || employeeTypeColors.default;
  };

  return (
    <Sheet 
      isOpen={open}
      onClose={onClose}
      snapPoints={[1]}
      initialSnap={0}
    >
      <Sheet.Container>
          <Sheet.Header>
            {/* Drag handle */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px 0',
              cursor: 'grab',
            }}>
              <div style={{
                width: '60px',
                height: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
              }} />
            </div>
            {/* Weekday Calendar - moved to top */}
            <Box sx={{ px: 2, pb: 2 }}>
                <WeekdayCalendar />
              </Box>
          </Sheet.Header>
          <Sheet.Content disableDrag={true}>
            
            <Box sx={{ flex: 1, overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>

              {/* Route List - First */}
              <RouteList />

              {/* Route Info - Second */}
              <RouteInfo />

              {/* Divider */}
              <Divider sx={{ mx: 3, mb: 2 }} />

              {/* User info and switch button - Third */}
              <Box sx={{ px: 3, pb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonOutlineIcon sx={{ color: '#86868b', mr: 2, fontSize: 24 }} />
                        <Typography variant="body1" sx={{ color: '#86868b' }}>
                          Kein Mitarbeiter ausgewählt
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Box
                    onClick={onUserSwitch}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      bgcolor: '#007AFF',
                      color: 'white',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: '#0056CC',
                        transform: 'scale(1.05)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                    }}
                  >
                    <SwapHorizIcon sx={{ fontSize: 20 }} />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}