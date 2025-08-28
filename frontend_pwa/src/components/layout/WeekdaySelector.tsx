import React from 'react';
import { Box, IconButton, Typography, Chip, Button } from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  AddCircle as AddCircleIcon,
  Route as RouteIcon
} from '@mui/icons-material';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointments } from '../../services/queries/useAppointments';
import { useRoutes, useOptimizeRoutes } from '../../services/queries/useRoutes';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { Weekday } from '../../types/models';

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
  const { selectedUserId } = useUserStore();
  const { clearCompletedStops } = useRouteCompletionStore();
  
  const { data: patients = [] } = usePatients();
  const { data: allAppointments = [] } = useAppointments();
  const { data: allRoutes = [] } = useRoutes();
  const { data: employees = [] } = useEmployees();
  const optimizeRoutesMutation = useOptimizeRoutes();

  const selectedEmployee = employees.find(emp => emp.id === selectedUserId);
  const selectedRoute = allRoutes.find(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);

  // Get German weekday name
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

  // Get current weekday and check if it's a weekday
  const getCurrentWeekday = () => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekdayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = weekdayMap[today] as any;
    
    // Only return if it's a weekday (Monday-Friday)
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(currentDay)) {
      return currentDay;
    }
    return null;
  };

  const currentWeekday = getCurrentWeekday();

  const weekdays = [
    { value: 'monday', label: 'Montag' },
    { value: 'tuesday', label: 'Dienstag' },
    { value: 'wednesday', label: 'Mittwoch' },
    { value: 'thursday', label: 'Donnerstag' },
    { value: 'friday', label: 'Freitag' }
  ];

  // Get appointments for a specific employee and day
  const getEmployeeAppointments = (weekday: string) => {
    return allAppointments.filter(a => a.employee_id === selectedUserId && a.weekday === weekday);
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
    const targetMinutes = Math.round(420 * ((selectedEmployee?.work_hours || 0) / 100));
    const utilizationPercent = targetMinutes > 0 ? Math.round((duration / targetMinutes) * 100) : 0;
    
    let utilizationColor = 'success.main';
    if (utilizationPercent > 100) {
      utilizationColor = 'error.main';
    }
    
    return {
      utilizationPercent,
      utilizationColor
    };
  };

  const handleOptimizeAll = async () => {
    if (!selectedUserId) return;
    
    try {
      // Optimize routes for all weekdays
      const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      await Promise.all(
        weekdays.map(weekday => 
          optimizeRoutesMutation.mutateAsync({
            weekday,
            employeeId: selectedUserId
          })
        )
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
        top: 58,
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
          
          const dayRoute = allRoutes.find(route => route.employee_id === selectedUserId && route.weekday === weekday.value);
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

      {/* Optimize All Button */}
      <Box sx={{ p: 1 }}>
        <Button
          variant="contained"
          onClick={handleOptimizeAll}
          disabled={optimizeRoutesMutation.isPending}
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
            width: '100%',
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
            {optimizeRoutesMutation.isPending ? 'Optimiere alle...' : 'Alle Routen optimieren'}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};
