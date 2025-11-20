import React, { MouseEvent, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip, Button, Menu, MenuItem } from '@mui/material';
import { 
  Home as HomeIcon,
  Phone as PhoneIcon,
  AddCircle as AddCircleIcon,
  Route as RouteIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';
import { usePatients, patientKeys } from '../../services/queries/usePatients';
import { useAppointments, appointmentKeys } from '../../services/queries/useAppointments';
import { useRoutes, useOptimizeRoutes, useOptimizeWeekendRoutes, routeKeys } from '../../services/queries/useRoutes';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { useCalendarWeek, useCalendarWeeks, calendarWeekKeys } from '../../services/queries/useCalendarWeek';
import { Weekday } from '../../types/models';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentCalendarWeek } from '../../utils/calendarUtils';

interface WeekdaySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onWeekdaySelect: (weekday: string) => void;
}

export const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({
  isOpen,
  onClose,
  onWeekdaySelect,
}) => {
  const { selectedWeekday } = useWeekdayStore();
  const selectedCalendarWeek = useCalendarWeekStore(state => state.selectedCalendarWeek);
  const setSelectedCalendarWeek = useCalendarWeekStore(state => state.setSelectedCalendarWeek);
  const availableCalendarWeeks = useCalendarWeekStore(state => state.availableCalendarWeeks);
  const setAvailableCalendarWeeks = useCalendarWeekStore(state => state.setAvailableCalendarWeeks);
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { clearCompletedStops } = useRouteCompletionStore();
  const queryClient = useQueryClient();
  const [calendarWeekMenuAnchorEl, setCalendarWeekMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  const { data: patients = [] } = usePatients();
  const { data: allAppointments = [] } = useAppointments();
  const { data: allRoutes = [] } = useRoutes();
  const { data: employees = [] } = useEmployees();
  const { data: bestCalendarWeek } = useCalendarWeek();
  const { data: fetchedCalendarWeeks = [] } = useCalendarWeeks();
  const optimizeRoutesMutation = useOptimizeRoutes();
  const optimizeWeekendRoutesMutation = useOptimizeWeekendRoutes();
  const currentCalendarWeek = useMemo(() => getCurrentCalendarWeek(), []);

  const selectedEmployee = employees.find(emp => emp.id === selectedUserId);

  // Set calendar week when data is loaded
  useEffect(() => {
    if (bestCalendarWeek && !selectedCalendarWeek) {
      setSelectedCalendarWeek(bestCalendarWeek);
    }
  }, [bestCalendarWeek, selectedCalendarWeek, setSelectedCalendarWeek]);

  useEffect(() => {
    if (fetchedCalendarWeeks.length > 0) {
      setAvailableCalendarWeeks(fetchedCalendarWeeks);
    }
  }, [fetchedCalendarWeeks, setAvailableCalendarWeeks]);

  const sortedCalendarWeeks = useMemo(() => {
    const weeks = [...availableCalendarWeeks];
    weeks.sort((a, b) => a - b);
    return weeks;
  }, [availableCalendarWeeks]);

  const handleCalendarWeekChange = (week: number) => {
    setSelectedCalendarWeek(week);
    setCalendarWeekMenuAnchorEl(null);
    queryClient.setQueryData(calendarWeekKeys.best(), week);
    queryClient.invalidateQueries({ queryKey: patientKeys.all, exact: false });
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all, exact: false });
    queryClient.invalidateQueries({ queryKey: routeKeys.all, exact: false });
    clearCompletedStops();
  };

  const handleCalendarWeekMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setCalendarWeekMenuAnchorEl(event.currentTarget);
  };

  const handleCalendarWeekMenuClose = () => {
    setCalendarWeekMenuAnchorEl(null);
  };

  // Get German weekday name
  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      'monday': 'Mo',
      'tuesday': 'Di',
      'wednesday': 'Mi',
      'thursday': 'Do',
      'friday': 'Fr',
      'saturday': 'Sa',
      'sunday': 'So'
    };
    return weekdayMap[weekday] || weekday;
  };

  // Get current weekday
  const getCurrentWeekday = () => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekdayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdayMap[today] as any;
  };

  const currentWeekday = getCurrentWeekday();

  // Determine which weekdays to show based on selection
  const getWeekdaysToShow = () => {
    if (selectedWeekendArea) {
      // Show only weekend days when weekend area is selected
      return [
        { value: 'saturday', label: 'Samstag' },
        { value: 'sunday', label: 'Sonntag' }
      ];
    } else {
      // Show only weekdays when employee is selected
      return [
        { value: 'monday', label: 'Montag' },
        { value: 'tuesday', label: 'Dienstag' },
        { value: 'wednesday', label: 'Mittwoch' },
        { value: 'thursday', label: 'Donnerstag' },
        { value: 'friday', label: 'Freitag' }
      ];
    }
  };

  const weekdays = getWeekdaysToShow();

  // Get appointments for a specific employee and day
  const getEmployeeAppointments = (weekday: string) => {
    if (selectedWeekendArea) {
      // For weekend areas, get appointments for the selected weekend area
      return allAppointments.filter(a => a.weekday === weekday && a.area === selectedWeekendArea);
    } else {
      // For employees, get appointments with the selected employee
      return allAppointments.filter(a => a.employee_id === selectedUserId && a.weekday === weekday);
    }
  };

  // Group patients by visit type
  const getPatientsByVisitType = (appointments: any[], visitType: 'HB' | 'NA' | 'TK') => {
    const typeAppointments = appointments.filter(a => a.visit_type === visitType);
    const patientIds = Array.from(new Set(typeAppointments.map(a => a.patient_id)));
    return patientIds
      .map(id => patients.find(p => p.id === id))
      .filter(p => p !== undefined);
  };

  // Calculate utilization percentage
  const calculateUtilization = (duration: number) => {
    let targetMinutes: number;
    
    if (selectedWeekendArea) {
      // For weekend tours: 75% of 420 minutes = 315 minutes target
      targetMinutes = 315;
    } else {
      // For employees: based on work_hours percentage
      targetMinutes = Math.round(420 * ((selectedEmployee?.work_hours || 0) / 100));
    }
    
    const utilizationPercent = targetMinutes > 0 ? Math.round((duration / targetMinutes) * 100) : 0;
    
    let utilizationColor = 'success.main';
    if (utilizationPercent > 100) {
      utilizationColor = 'error.main';
    } else if (utilizationPercent > 90) {
      utilizationColor = 'warning.main';
    } else if (utilizationPercent > 70) {
      utilizationColor = 'success.light';
    }
    
    return {
      utilizationPercent,
      utilizationColor
    };
  };

  const handleOptimizeAll = async () => {
    try {
      // Optimize only the days that are shown in the weekday selector
      await Promise.all(
        weekdays.map(weekday => {
          if (selectedWeekendArea) {
            // For weekend tours: optimize each visible weekend day
            return optimizeWeekendRoutesMutation.mutateAsync({
              weekday: weekday.value,
              area: selectedWeekendArea
            });
          } else if (selectedUserId) {
            // For employees: optimize each visible weekday
            return optimizeRoutesMutation.mutateAsync({
              weekday: weekday.value,
              employeeId: selectedUserId
            });
          }
        })
      );
      
      // Reset route completion status after optimization
      clearCompletedStops();
    } catch (error) {
      console.error('Failed to optimize all routes:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 28,
        left: 28,
        right: 28,
        height: 200, // Increased height to accommodate the button
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10000,
      }}
    >
      {/* Weekdays Grid */}
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 1,
          p: 1,
          pb: 0,
        }}
      >
        {weekdays.map((weekday) => {
          const dayAppointments = getEmployeeAppointments(weekday.value);
          const hbPatients = getPatientsByVisitType(dayAppointments, 'HB');
          const tkPatients = getPatientsByVisitType(dayAppointments, 'TK');
          const naPatients = getPatientsByVisitType(dayAppointments, 'NA');
          const totalAppointments = hbPatients.length + tkPatients.length + naPatients.length;
          
          const dayRoute = selectedWeekendArea 
            ? allRoutes.find(route => !route.employee_id && route.area === selectedWeekendArea && route.weekday === weekday.value)
            : allRoutes.find(route => route.employee_id === selectedUserId && route.weekday === weekday.value);
          const utilization = dayRoute ? calculateUtilization(dayRoute.total_duration) : { utilizationPercent: 0, utilizationColor: 'success.main' };

          return (
            <Box
              key={weekday.value}
              onClick={() => onWeekdaySelect(weekday.value)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedWeekday === weekday.value ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                border: selectedWeekday === weekday.value ? '1px solid rgba(0, 122, 255, 0.2)' : '1px solid transparent',
                position: 'relative',
                p: 1,
                '&:active': {
                  bgcolor: selectedWeekday === weekday.value ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                  transform: 'scale(0.95)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Weekday */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: currentWeekday === weekday.value ? 700 : 600,
                  fontSize: '0.75rem',
                  color: selectedWeekday === weekday.value ? '#007AFF' : '#1d1d1f',
                  mb: 0.5,
                }}
              >
                {getGermanWeekday(weekday.value)}
              </Typography>

              {/* Appointments with Icons */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 0.25, 
                  width: '100%',
                  mb: 0.5,
                }}
              >
                <Chip 
                  size="small" 
                  icon={<HomeIcon fontSize="small" />} 
                  label={hbPatients.length} 
                  color="primary" 
                  variant="outlined"
                  sx={{ 
                    height: 16, 
                    fontSize: '0.6rem',
                    borderColor: 'rgba(25, 118, 210, 0.3)',
                    bgcolor: 'rgba(25, 118, 210, 0.05)',
                    flex: 1,
                    minWidth: 0,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }
                  }}
                />
                <Chip 
                  size="small" 
                  icon={<PhoneIcon fontSize="small" />} 
                  label={tkPatients.length} 
                  color="success" 
                  variant="outlined"
                  sx={{ 
                    height: 16, 
                    fontSize: '0.6rem',
                    borderColor: 'rgba(76, 175, 80, 0.3)',
                    bgcolor: 'rgba(76, 175, 80, 0.05)',
                    flex: 1,
                    minWidth: 0,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }
                  }}
                />
                <Chip 
                  size="small" 
                  icon={<AddCircleIcon fontSize="small" />} 
                  label={naPatients.length} 
                  color="secondary" 
                  variant="outlined"
                  sx={{ 
                    height: 16, 
                    fontSize: '0.6rem',
                    borderColor: 'rgba(156, 39, 176, 0.3)',
                    bgcolor: 'rgba(156, 39, 176, 0.05)',
                    flex: 1,
                    minWidth: 0,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }
                  }}
                />
              </Box>

              {/* Utilization */}
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  color: utilization.utilizationColor,
                  fontWeight: 500,
                }}
              >
                {utilization.utilizationPercent}%
              </Typography>
              
              {/* Current day indicator */}
              {currentWeekday === weekday.value && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#007AFF',
                    position: 'absolute',
                    top: 2,
                    border: '1px solid rgba(0, 122, 255, 0.2)',
                    boxShadow: '0 1px 2px rgba(0, 122, 255, 0.3)',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Optimize All Button and Calendar Week */}
      <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={handleOptimizeAll}
          disabled={optimizeRoutesMutation.isPending || optimizeWeekendRoutesMutation.isPending || (!selectedUserId && !selectedWeekendArea)}
          sx={{
            bgcolor: '#4CAF50',
            borderRadius: 1.5,
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            p: 1.5,
            minHeight: 'unset',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'flex-start',
            flex: 1,
            '&:hover': {
              bgcolor: '#388E3C',
            },
            '&:disabled': {
              bgcolor: 'rgba(76, 175, 80, 0.5)',
            }
          }}
        >
          <RouteIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {(optimizeRoutesMutation.isPending || optimizeWeekendRoutesMutation.isPending) 
              ? 'Optimiere alle...' 
              : 'Alle Routen optimieren'}
          </Typography>
        </Button>
        
        {/* Calendar Week Display */}
        <Button
          variant="text"
          onClick={handleCalendarWeekMenuOpen}
          endIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: selectedCalendarWeek === currentCalendarWeek ? '#2e7d32' : '#007AFF',
            fontWeight: 600,
            fontSize: '0.7rem',
            textTransform: 'none',
            px: 1.5,
            minWidth: 'fit-content',
            height: '100%',
            borderRadius: 1.5,
            border: selectedCalendarWeek === currentCalendarWeek
              ? '1px solid rgba(76, 175, 80, 0.4)'
              : '1px solid rgba(0, 122, 255, 0.2)',
            bgcolor: selectedCalendarWeek === currentCalendarWeek
              ? 'rgba(76, 175, 80, 0.15)'
              : 'rgba(0, 122, 255, 0.1)',
            '&:hover': {
              backgroundColor: selectedCalendarWeek === currentCalendarWeek
                ? 'rgba(56, 142, 60, 0.2)'
                : 'rgba(0, 122, 255, 0.15)',
            },
          }}
        >
          KW {selectedCalendarWeek ?? '--'}
        </Button>
      </Box>

      <Menu
        anchorEl={calendarWeekMenuAnchorEl}
        open={Boolean(calendarWeekMenuAnchorEl)}
        onClose={handleCalendarWeekMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        MenuListProps={{
          dense: true,
        }}
      >
        {sortedCalendarWeeks.length === 0 ? (
          <MenuItem disabled>Keine Kalenderwochen verfügbar</MenuItem>
        ) : (
          sortedCalendarWeeks.map((week) => (
            <MenuItem
              key={week}
              selected={week === selectedCalendarWeek}
              onClick={() => handleCalendarWeekChange(week)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                backgroundColor: week === currentCalendarWeek ? 'rgba(76, 175, 80, 0.12)' : 'transparent',
                '&.Mui-selected': {
                  backgroundColor: week === currentCalendarWeek ? 'success.main' : 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: week === currentCalendarWeek ? 'success.dark' : 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: week === currentCalendarWeek ? 'rgba(56, 142, 60, 0.18)' : 'rgba(0, 122, 255, 0.1)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: week === selectedCalendarWeek ? 600 : 400,
                    color:
                      week === selectedCalendarWeek
                        ? 'inherit'
                        : week === currentCalendarWeek
                        ? 'success.dark'
                        : 'inherit',
                  }}
                >
                  KW {week}
                </Typography>
                {week === currentCalendarWeek && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor:
                        week === selectedCalendarWeek ? 'white' : 'success.main',
                      border: week === selectedCalendarWeek ? '1px solid rgba(255, 255, 255, 0.6)' : 'none',
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
};
