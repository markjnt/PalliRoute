import React, { useState, useMemo, useEffect } from 'react';
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
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
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
  const { isStopCompleted, toggleStop, setCurrentWeekday, completedStops } = useRouteCompletionStore();
  
  // Data hooks
  const { data: employees = [] } = useEmployees();
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });

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

  // Update current weekday in store and auto-reset when switching days
  useEffect(() => {
    setCurrentWeekday(selectedWeekday);
  }, [selectedWeekday, setCurrentWeekday]);

  // Early return if no user is selected
  if (!selectedUserId) {
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
            Bitte wählen Sie einen Mitarbeiter aus
          </Typography>
        </Box>
      </Box>
    );
  }

  // Immer nur die Route des ausgewählten Mitarbeiters anzeigen
  const visibleRoutes = useMemo(() => {
    return routes.filter(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
  }, [routes, selectedUserId, selectedWeekday]);

  // Create route stops for all visible routes
  const routeStops = useMemo(() => {
    const stops: RouteStop[] = [];
    
    if (!selectedUserId) return stops;
    
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
  }, [visibleRoutes, employees, patients, appointments, selectedUserId, isStopCompleted]);

  // Get TK appointments (phone calls) for the selected employee and day
  const tkAppointments = useMemo(() => {
    if (!selectedUserId) return [];
    
    const tkApps = appointments.filter(a => 
      a.employee_id === selectedUserId && 
      a.weekday === selectedWeekday && 
      a.visit_type === 'TK'
    );
    
    return tkApps.map(appointment => {
      const patient = patients.find(p => p.id === appointment.patient_id);
      return {
        id: appointment.id || 0,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unbekannter Patient',
        phone: patient?.phone1 || patient?.phone2 || 'Keine Telefonnummer',
        time: appointment.time,
        isCompleted: isStopCompleted(appointment.id || 0),
      };
    });
  }, [appointments, selectedUserId, selectedWeekday, patients, isStopCompleted]);

  // Calculate completion percentage - now using store state directly
  const completionPercentage = useMemo(() => {
    if (routeStops.length === 0) return 0;
    const completed = routeStops.filter(stop => completedStops.has(stop.id)).length;
    return (completed / routeStops.length) * 100;
  }, [routeStops, completedStops]);

  const handleStopToggle = (stopId: number) => {
    toggleStop(stopId);
  };

  const handleTKToggle = (appointmentId: number) => {
    toggleStop(appointmentId);
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
            Keine Route für {getGermanWeekday(selectedWeekday)}
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
                transition: 'background-color 0.2s ease',
              }}
            >
              {/* Position Number */}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: isStopCompleted(stop.id) ? '#34C759' : '#007AFF',
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
                      color: isStopCompleted(stop.id) ? '#8E8E93' : '#1d1d1f',
                      textDecoration: isStopCompleted(stop.id) ? 'line-through' : 'none',
                      flex: 1,
                    }}
                  >
                    {stop.patientName}
                  </Typography>
                  <Chip
                    label={stop.visitType === 'HB' ? 'HB' : stop.visitType}
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
                      fontSize: '0.75rem'
                    }}
                    onClick={() => {
                      const encodedAddress = encodeURIComponent(stop.address);
                      window.location.href = `https://maps.google.com/?q=${encodedAddress}`;
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
                checked={isStopCompleted(stop.id)}
                icon={<UncheckedIcon sx={{ color: '#C7C7CC' }} />}
                checkedIcon={<CheckCircleIcon sx={{ color: '#34C759' }} />}
                sx={{
                  ml: 1,
                  '&:hover': {
                    bgcolor: 'transparent',
                  },
                }}
                onClick={(e) => e.stopPropagation()}
                onChange={() => handleStopToggle(stop.id)}
              />
            </Box>
            
            {index < routeStops.length - 1 && (
              <Divider sx={{ mx: 1.5 }} />
            )}
          </Box>
        ))}
      </Box>

      {/* TK Appointments (Phone Calls) */}
      {tkAppointments.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              bgcolor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}
          >
            {tkAppointments.map((tkApp, index) => (
              <Box key={tkApp.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {/* Phone Icon */}
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: isStopCompleted(tkApp.id) ? '#34C759' : '#4CAF50',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      mr: 2,
                      flexShrink: 0,
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 16 }} />
                  </Box>

                  {/* TK Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: isStopCompleted(tkApp.id) ? '#8E8E93' : '#1d1d1f',
                          textDecoration: isStopCompleted(tkApp.id) ? 'line-through' : 'none',
                          flex: 1,
                        }}
                      >
                        {tkApp.patientName}
                      </Typography>
                      <Chip
                        label="TK"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(76, 175, 80, 0.2)',
                          color: '#4CAF50',
                          fontSize: '0.75rem',
                          height: 20,
                          ml: 1,
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#8E8E93',
                          fontSize: '0.75rem'
                        }}
                      >
                        {tkApp.phone}
                      </Typography>
                    </Box>
                    
                    {tkApp.time && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <TimeIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#8E8E93',
                            fontSize: '0.75rem',
                          }}
                        >
                          {tkApp.time}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Checkbox */}
                  <Checkbox
                    checked={isStopCompleted(tkApp.id)}
                    icon={<UncheckedIcon sx={{ color: '#C7C7CC' }} />}
                    checkedIcon={<CheckCircleIcon sx={{ color: '#34C759' }} />}
                    sx={{
                      ml: 1,
                      '&:hover': {
                        bgcolor: 'transparent',
                      },
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => handleTKToggle(tkApp.id)}
                  />
                </Box>
                
                {index < tkAppointments.length - 1 && (
                  <Divider sx={{ mx: 1.5 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}; 