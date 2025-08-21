import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import {
  DirectionsCar as DirectionsCarIcon,
  AccessTime as AccessTimeIcon,
  Route as RouteIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  AddCircle as AddCircleIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useRoutes, useOptimizeRoutes } from '../../services/queries/useRoutes';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useEmployees } from '../../services/queries/useEmployees';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { Weekday } from '../../types/models';

export const RouteInfo: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { clearCompletedStops } = useRouteCompletionStore();
  
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: employees = [] } = useEmployees();
  const optimizeRoutesMutation = useOptimizeRoutes();

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

  // Calculate utilization percentage with color logic
  const calculateUtilization = (duration: number) => {
    // Calculate target work time: 7h = 420min * (work_hours / 100)
    const targetMinutes = Math.round(420 * ((selectedEmployee?.work_hours || 0) / 100));
    
    // Calculate utilization percentage
    const utilizationPercent = targetMinutes > 0 ? Math.round((duration / targetMinutes) * 100) : 0;
    
    // Determine color based on utilization
    let utilizationColor = 'success.main'; // Green by default
    if (utilizationPercent > 100) {
      utilizationColor = 'error.main'; // Red if over 100%
    }
    
    return {
      utilizationPercent,
      utilizationColor
    };
  };

  const utilizationInfo = calculateUtilization(selectedRoute.total_duration);

  const handleOptimize = async () => {
    if (!selectedUserId || !selectedWeekday) return;
    
    try {
      await optimizeRoutesMutation.mutateAsync({
        weekday: selectedWeekday,
        employeeId: selectedUserId
      });
      
      // Reset route completion status after optimization
      clearCompletedStops();
    } catch (error) {
      console.error('Failed to optimize routes:', error);
    }
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          height: '200px', // Feste Höhe
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', // Vertikal zentrieren
        }}
      >


        {/* Route Stats Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 1,
          mb: 1
        }}>
          {/* Distance */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              bgcolor: 'rgba(0, 122, 255, 0.1)',
              borderRadius: 1.5,
              border: '1px solid rgba(0, 122, 255, 0.2)',
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

          {/* Utilization with color logic */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              bgcolor: 'rgba(255, 149, 0, 0.1)',
              borderRadius: 1.5,
              border: '1px solid rgba(255, 149, 0, 0.2)',
            }}
          >
            <AccessTimeIcon sx={{ color: '#FF9500', fontSize: 18 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#FF9500', fontWeight: 500, display: 'block' }}>
                Auslastung
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: utilizationInfo.utilizationColor }}>
                {utilizationInfo.utilizationPercent}%
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Appointments - Full Width */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            bgcolor: 'rgba(76, 175, 80, 0.1)',
            borderRadius: 1.5,
            border: '1px solid rgba(76, 175, 80, 0.2)',
            mb: 1,
          }}
        >
          <EventIcon sx={{ color: '#4CAF50', fontSize: 18 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 500, display: 'block', mb: 0.5 }}>
              Termine
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {hbPatients.length > 0 && (
                <Chip 
                  size="small" 
                  icon={<HomeIcon fontSize="small" />} 
                  label={hbPatients.length} 
                  color="primary" 
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem', mb: 0.5 }}
                />
              )}
              {tkPatients.length > 0 && (
                <Chip 
                  size="small" 
                  icon={<PhoneIcon fontSize="small" />} 
                  label={tkPatients.length} 
                  color="success" 
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem', mb: 0.5 }}
                />
              )}
              {naPatients.length > 0 && (
                <Chip 
                  size="small" 
                  icon={<AddCircleIcon fontSize="small" />} 
                  label={naPatients.length} 
                  color="secondary" 
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem', mb: 0.5 }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Optimize Button - Full Width */}
        <Button
          variant="contained"
          onClick={handleOptimize}
          disabled={optimizeRoutesMutation.isPending}
          sx={{
            bgcolor: '#9C27B0',
            borderRadius: 1.5,
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            p: 1,
            minHeight: 'unset',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'flex-start',
            width: '100%',
            '&:hover': {
              bgcolor: '#7B1FA2',
            },
            '&:disabled': {
              bgcolor: 'rgba(156, 39, 176, 0.5)',
            }
          }}
        >
          <RouteIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {optimizeRoutesMutation.isPending ? 'Optimiere...' : 'Optimieren'}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};
