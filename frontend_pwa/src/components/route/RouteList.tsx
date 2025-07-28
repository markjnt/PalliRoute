import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useRouteVisibilityStore } from '../../stores/useRouteVisibilityStore';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { parseRouteOrder } from '../../utils/mapUtils';
import { getColorForVisitType, getColorForEmployeeType } from '../../utils/mapUtils';
import { getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';

interface RouteStop {
  id: number;
  position: number;
  patientName: string;
  address: string;
  visitType: string;
  time?: string;
  isCompleted: boolean;
}

export const RouteList: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { showOnlyOwnRoute } = useRouteVisibilityStore();
  const { isStopCompleted, toggleStop } = useRouteCompletionStore();
  
  // Data hooks
  const { data: employees = [] } = useEmployees();
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });

  // Get visible routes based on toggle
  const visibleRoutes = useMemo(() => {
    if (showOnlyOwnRoute) {
      return routes.filter(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
    } else {
      return routes.filter(route => route.weekday === selectedWeekday);
    }
  }, [routes, selectedUserId, selectedWeekday, showOnlyOwnRoute]);

  // Create route stops for all visible routes
  const routeStops = useMemo(() => {
    const stops: RouteStop[] = [];
    
    visibleRoutes.forEach(route => {
      const employee = employees.find(e => e.id === route.employee_id);
      const routeOrder = parseRouteOrder(route.route_order);
      
      routeOrder.forEach((appointmentId, index) => {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (appointment) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
                         stops.push({
               id: appointmentId,
               position: index + 1,
               patientName: `${patient.first_name} ${patient.last_name}`,
               address: `${patient.street}, ${patient.zip_code} ${patient.city}`,
               visitType: appointment.visit_type,
               time: appointment.time,
               isCompleted: isStopCompleted(appointmentId),
             });
          }
        }
      });
    });
    
    return stops;
  }, [visibleRoutes, employees, patients, appointments]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (routeStops.length === 0) return 0;
    const completed = routeStops.filter(stop => stop.isCompleted).length;
    return (completed / routeStops.length) * 100;
  }, [routeStops]);

  const handleStopToggle = (stopId: number) => {
    toggleStop(stopId);
  };

  if (routeStops.length === 0) {
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
            Keine Route für {selectedWeekday} verfügbar
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {/* Route Progress Header */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: '#1d1d1f' }}>
            Route Fortschritt
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#007AFF' }}>
            {Math.round(completionPercentage)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={completionPercentage}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#007AFF',
              borderRadius: 3,
            },
          }}
        />
      </Box>

      {/* Route Stops */}
      <Box
        sx={{
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        }}
      >
        {routeStops.map((stop, index) => (
          <Box key={stop.id}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
              onClick={() => handleStopToggle(stop.id)}
            >
              {/* Position Number */}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: stop.isCompleted ? '#34C759' : '#007AFF',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  mr: 2,
                  flexShrink: 0,
                }}
              >
                {stop.position}
              </Box>

              {/* Stop Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: stop.isCompleted ? '#8E8E93' : '#1d1d1f',
                      textDecoration: stop.isCompleted ? 'line-through' : 'none',
                      flex: 1,
                    }}
                  >
                    {stop.patientName}
                  </Typography>
                  <Chip
                    label={stop.visitType === 'HB' ? 'Hausbesuch' : stop.visitType}
                    size="small"
                    sx={{
                      bgcolor: `${getColorForVisitType(stop.visitType)}20`,
                      color: getColorForVisitType(stop.visitType),
                      fontSize: '0.75rem',
                      height: 20,
                      ml: 1,
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#8E8E93',
                      fontSize: '0.75rem',
                    }}
                  >
                    {stop.address}
                  </Typography>
                </Box>
                
                {stop.time && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#8E8E93',
                        fontSize: '0.75rem',
                      }}
                    >
                      {stop.time}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Checkbox */}
              <Checkbox
                checked={stop.isCompleted}
                icon={<UncheckedIcon sx={{ color: '#C7C7CC' }} />}
                checkedIcon={<CheckCircleIcon sx={{ color: '#34C759' }} />}
                sx={{
                  ml: 1,
                  '&:hover': {
                    bgcolor: 'transparent',
                  },
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Box>
            
            {index < routeStops.length - 1 && (
              <Divider sx={{ mx: 1.5 }} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}; 