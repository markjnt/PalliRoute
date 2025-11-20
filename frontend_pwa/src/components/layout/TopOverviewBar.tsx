import React, { useState, useEffect } from 'react';
import { Box, Avatar, IconButton, Typography, Chip } from '@mui/material';
import {
  Home as HomeIcon,
  Phone as PhoneIcon,
  AddCircle as AddCircleIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { employeeTypeColors } from '../../utils/colors';
import { Weekday } from '../../types/models';
import { WeekdaySelector } from './WeekdaySelector';

interface TopOverviewBarProps {
  onUserSwitch: () => void;
  onSheetToggle: () => void;
  onCloseWeekdaySelector?: () => void;
}

export const TopOverviewBar: React.FC<TopOverviewBarProps> = ({ onUserSwitch, onSheetToggle, onCloseWeekdaySelector }) => {
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
  const [isWeekdayMenuOpen, setIsWeekdayMenuOpen] = useState(false);

  // Close weekday selector when requested from outside
  useEffect(() => {
    if (onCloseWeekdaySelector) {
      const closeHandler = () => {
        setIsWeekdayMenuOpen(false);
      };
      // Store close handler so it can be called from MainLayout
      (window as any).__closeWeekdaySelector = closeHandler;
      return () => {
        delete (window as any).__closeWeekdaySelector;
      };
    }
  }, [onCloseWeekdaySelector]);

  const { data: employees = [] } = useEmployees();
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointmentsByWeekday(selectedWeekday as Weekday);

  const selectedEmployee = employees.find(emp => emp.id === selectedUserId);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEmployeeColor = (employeeFunction: string) => {
    return employeeTypeColors[employeeFunction] || employeeTypeColors.default;
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

  const handleWeekdayButtonClick = () => {
    setIsWeekdayMenuOpen(true);
  };

  const handleWeekdayMenuClose = () => {
    setIsWeekdayMenuOpen(false);
  };

  const handleWeekdaySelect = (weekday: string) => {
    setSelectedWeekday(weekday as any);
    setIsWeekdayMenuOpen(false);
  };

  // Get appointments for the selected employee and day
  const employeeAppointments = selectedWeekendArea 
    ? appointments.filter(a => a.weekday === selectedWeekday && a.area === selectedWeekendArea) // For weekend tours, show only appointments for the selected area
    : appointments.filter(a => a.employee_id === selectedUserId && a.weekday === selectedWeekday);

  // Group patients by visit type
  const getPatientsByVisitType = (visitType: 'HB' | 'NA' | 'TK') => {
    const typeAppointments = employeeAppointments.filter(a => a.visit_type === visitType);
    const patientIds = Array.from(new Set(typeAppointments.map(a => a.patient_id)));
    return patientIds
      .map(id => patients.find(p => p.id === id))
      .filter(p => p !== undefined);
  };

  const hbPatients = getPatientsByVisitType('HB');
  const tkPatients = getPatientsByVisitType('TK');
  const naPatients = getPatientsByVisitType('NA');

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          zIndex: 1000,
          height: 64,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          px: 0,
          gap: 1,
        }}
      >
        {/* Weekday Selection Button - LEFT */}
        <IconButton
          onClick={handleWeekdayButtonClick}
          sx={{
            width: 48,
            height: 48,
            bgcolor: 'rgba(0, 122, 255, 0.1)',
            border: '1px solid rgba(0, 122, 255, 0.2)',
            color: '#007AFF',
            position: 'relative',
            flexShrink: 0,
            ml: 1,
            '&:active': {
              bgcolor: 'rgba(0, 122, 255, 0.15)',
              transform: 'scale(0.95)',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: currentWeekday === selectedWeekday ? 700 : 600,
              fontSize: currentWeekday === selectedWeekday ? '1rem' : '0.9rem',
              lineHeight: 1,
            }}
          >
            {getGermanWeekday(selectedWeekday)}
          </Typography>
          
          {/* Current day indicator */}
          {currentWeekday === selectedWeekday && (
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: '#007AFF',
                position: 'absolute',
                bottom: 4,
                border: '1px solid rgba(0, 122, 255, 0.2)',
                boxShadow: '0 1px 2px rgba(0, 122, 255, 0.3)',
              }}
            />
          )}
        </IconButton>

        {/* Appointments Overview - CENTER */}
        <Box
          sx={{
            flex: 1,
            height: 48,
            bgcolor: 'rgba(0, 122, 255, 0.1)',
            border: '1px solid rgba(0, 122, 255, 0.2)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            cursor: 'pointer',
            '&:active': {
              bgcolor: 'rgba(0, 122, 255, 0.15)',
              transform: 'scale(1.02)',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={onSheetToggle}
        >
          <MenuIcon sx={{ color: '#007AFF', fontSize: 20 }} />
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 0.5, 
              flexWrap: 'nowrap',
              width: '100%',
            }}
          >
            <Chip 
              size="small" 
              icon={<HomeIcon fontSize="small" />} 
              label={hbPatients.length} 
              color="primary" 
              variant="outlined"
              sx={{ 
                height: 20, 
                fontSize: '0.7rem',
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
                height: 20, 
                fontSize: '0.7rem',
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
                height: 20, 
                fontSize: '0.7rem',
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
        </Box>

        {/* User Avatar or Weekend Area - RIGHT */}
        <Avatar
          onClick={onUserSwitch}
          sx={{
            width: 48,
            height: 48,
            bgcolor: selectedWeekendArea 
              ? '#ff9800'
              : selectedEmployee ? getEmployeeColor(selectedEmployee.function) : '#007AFF',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            flexShrink: 0,
            mr: 1,
            '&:active': {
              transform: 'scale(0.95)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {selectedWeekendArea ? (
            selectedWeekendArea === 'Nord' ? 'N' : 
            selectedWeekendArea === 'Mitte' ? 'M' : 
            selectedWeekendArea === 'Süd' ? 'S' : 
            selectedWeekendArea.charAt(0)
          ) : selectedEmployee ? (
            getInitials(selectedEmployee.first_name, selectedEmployee.last_name)
          ) : (
            '?'
          )}
        </Avatar>
      </Box>

      {/* Weekday Selector */}
      <WeekdaySelector
        isOpen={isWeekdayMenuOpen}
        onClose={handleWeekdayMenuClose}
        onWeekdaySelect={handleWeekdaySelect}
      />
    </>
  );
};
