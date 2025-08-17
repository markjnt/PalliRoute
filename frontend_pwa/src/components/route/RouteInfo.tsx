import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  DirectionsCar as DirectionsCarIcon,
  AccessTime as AccessTimeIcon,
  Route as RouteIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  AddCircle as AddCircleIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useRoutes } from '../../services/queries/useRoutes';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useEmployees } from '../../services/queries/useEmployees';
import { Weekday } from '../../types/models';

export const RouteInfo: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: employees = [] } = useEmployees();

  // Get German weekday name
  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      'monday': 'Montag',
      'tuesday': 'Dienstag',
      'wednesday': 'Mittwoch',
      'thursday': 'Donnerstag',
      'friday': 'Freitag'
    };
    return weekdayMap[weekday] || weekday;
  };

  // Immer nur die Route des ausgewählten Mitarbeiters anzeigen
  const selectedRoute = useMemo(() => {
    return routes.find(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
  }, [routes, selectedUserId, selectedWeekday]);

  // Get selected employee for work_hours
  const selectedEmployee = useMemo(() => {
    return employees.find(emp => emp.id === selectedUserId);
  }, [employees, selectedUserId]);

  // Get appointments for the selected employee and day
  const employeeAppointments = useMemo(() => {
    return appointments.filter(a => a.employee_id === selectedUserId && a.weekday === selectedWeekday);
  }, [appointments, selectedUserId, selectedWeekday]);

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

  if (!selectedRoute) {
    return (
      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Keine Route für {getGermanWeekday(selectedWeekday)} verfügbar
          </Typography>
        </Box>
      </Box>
    );
  }

  // Format distance (backend already provides distance in km, format with German locale)
  const formatDistance = (distance: number): string => {
    return distance.toLocaleString('de-DE', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    }) + ' km';
  };

  // Format duration with color logic like in TourContainer
  const formatDurationWithColor = (duration: number) => {
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const durationStr = `${hours}:${minutes.toString().padStart(2, '0')}`;
      
      // Calculate target work time: 7h = 420min * (work_hours / 100)
      const targetMinutes = Math.round(420 * ((selectedEmployee?.work_hours || 0) / 100));
      const targetHours = Math.floor(targetMinutes / 60);
      const targetMins = targetMinutes % 60;
      const targetStr = `${targetHours}:${targetMins.toString().padStart(2, '0')}`;
      
      // Determine color based on duration vs target
      let durationColor = 'success.main'; // Green by default
      if (duration > targetMinutes) {
        durationColor = 'error.main'; // Red if over target
      }
      
      return {
        durationStr,
        targetStr,
        durationColor
      };
    }
    
    // For durations under 60 minutes
    const targetMinutes = Math.round(420 * ((selectedEmployee?.work_hours || 0) / 100));
    let durationColor = 'success.main';
    if (duration > targetMinutes) {
      durationColor = 'error.main';
    }
    
    return {
      durationStr: `${duration} Min`,
      targetStr: `${Math.floor(targetMinutes / 60)}:${(targetMinutes % 60).toString().padStart(2, '0')}`,
      durationColor
    };
  };

  const durationInfo = formatDurationWithColor(selectedRoute.total_duration);

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <RouteIcon sx={{ color: '#007AFF', mr: 1, fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
            Routeninformationen
          </Typography>
        </Box>

        {/* Route Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, justifyContent: 'space-between' }}>
          {/* Distance */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              bgcolor: 'rgba(0, 122, 255, 0.1)',
              borderRadius: 1.5,
              border: '1px solid rgba(0, 122, 255, 0.2)',
              flex: '1 1 0',
              minWidth: 'fit-content',
              maxWidth: '48%',
            }}
          >
            <DirectionsCarIcon sx={{ color: '#007AFF', fontSize: 18 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#007AFF', fontWeight: 500, display: 'block' }}>
                Distanz
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
                {formatDistance(selectedRoute.total_distance)}
              </Typography>
            </Box>
          </Box>

          {/* Duration with color logic */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              bgcolor: 'rgba(255, 149, 0, 0.1)',
              borderRadius: 1.5,
              border: '1px solid rgba(255, 149, 0, 0.2)',
              flex: '1 1 0',
              minWidth: 'fit-content',
              maxWidth: '48%',
            }}
          >
            <AccessTimeIcon sx={{ color: '#FF9500', fontSize: 18 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#FF9500', fontWeight: 500, display: 'block' }}>
                Zeit
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: durationInfo.durationColor }}>
                  {durationInfo.durationStr}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  / {durationInfo.targetStr}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Appointment Type Summary - Beautiful Chips like in TourContainer */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Termine
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {hbPatients.length > 0 && (
              <Chip 
                size="small" 
                icon={<HomeIcon fontSize="small" />} 
                label={hbPatients.length} 
                color="primary" 
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            )}
            {tkPatients.length > 0 && (
              <Chip 
                size="small" 
                icon={<PhoneIcon fontSize="small" />} 
                label={tkPatients.length} 
                color="success" 
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            )}
            {naPatients.length > 0 && (
              <Chip 
                size="small" 
                icon={<AddCircleIcon fontSize="small" />} 
                label={naPatients.length} 
                color="secondary" 
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
