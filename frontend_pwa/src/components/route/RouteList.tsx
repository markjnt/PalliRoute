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
  Info as InfoIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes, useReorderAppointment } from '../../services/queries/useRoutes';
import { parseRouteOrder } from '../../utils/mapUtils';
import { getColorForVisitType, getColorForEmployeeType } from '../../utils/mapUtils';
import { getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';
import RouteStopItem from './RouteStopItem';

interface RouteStop {
  id: number;
  position: number;
  patientName: string;
  address: string;
  visitType: string;
  time?: string;
  phone1?: string;
  phone2?: string;
  info?: string;
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
  const reorderMutation = useReorderAppointment();

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
              phone1: patient.phone1,
              phone2: patient.phone2,
              info: appointment.info,
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
      phone1: patient?.phone1,
      phone2: patient?.phone2,
      time: appointment.time,
      info: appointment.info,
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

  // Move stop function for react-dnd
  const moveStop = (dragIndex: number, hoverIndex: number) => {
    const draggedStop = routeStops[dragIndex];
    if (!draggedStop) return;

    // Find the route that contains this appointment
    const route = visibleRoutes.find(r => {
      const routeOrder = parseRouteOrder(r.route_order);
      return routeOrder.includes(draggedStop.id);
    });

    if (!route) return;

    // Use mutation without await to keep it synchronous for react-dnd
    reorderMutation.mutate({
      routeId: route.id,
      appointmentId: draggedStop.id,
      index: hoverIndex
    }, {
      onError: (error) => {
        console.error('Failed to reorder appointment:', error);
      }
    });
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
      {/* Route Stops with Progress Header */}
      <Box
        sx={{
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Route Progress Header */}
        <Box
          sx={{
            p: 1.5,
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#1d1d1f' }}>
              Fortschritt
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
        {routeStops.map((stop, index) => (
          <React.Fragment key={stop.id}>
            <RouteStopItem
              stop={stop}
              index={index}
              moveStop={moveStop}
              onToggle={handleStopToggle}
              isCompleted={isStopCompleted}
            />
            {index < routeStops.length - 1 && (
              <Divider sx={{ mx: 1.5 }} />
            )}
          </React.Fragment>
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
                    p: { xs: 1.25, sm: 1.5 },
                    transition: 'all 0.2s ease',
                    mx: 0.5,
                    my: 0.25,
                    borderRadius: 1,
                  }}
                >
                  {/* Phone Icon */}
                  <Box
                    sx={{
                      width: { xs: 32, sm: 36 },
                      height: { xs: 32, sm: 36 },
                      borderRadius: '50%',
                      bgcolor: isStopCompleted(tkApp.id) ? '#34C759' : '#4CAF50',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      mr: { xs: 1.5, sm: 2 },
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
                  </Box>

                  {/* TK Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: isStopCompleted(tkApp.id) ? '#8E8E93' : '#1d1d1f',
                          textDecoration: isStopCompleted(tkApp.id) ? 'line-through' : 'none',
                          flex: 1,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          lineHeight: 1.3,
                        }}
                      >
                        {tkApp.patientName}
                      </Typography>
                      <Chip
                        label="TK"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(76, 175, 80, 0.15)',
                          color: '#4CAF50',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          height: { xs: 18, sm: 20 },
                          ml: { xs: 0.75, sm: 1 },
                          fontWeight: 600,
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                        }}
                      />
                    </Box>
                    
                    {(tkApp.phone1 || tkApp.phone2) && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {tkApp.phone1 && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ 
                              fontSize: { xs: 13, sm: 14 }, 
                              color: '#8E8E93', 
                              mr: 0.5 
                            }} />
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#8E8E93',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                cursor: 'pointer',
                                transition: 'color 0.2s ease',
                              }}
                              onClick={() => {
                                const cleanPhone = tkApp.phone1!.replace(/\s+/g, '');
                                window.location.href = `tel:${cleanPhone}`;
                              }}
                            >
                              {tkApp.phone1}
                            </Typography>
                          </Box>
                        )}
                        {tkApp.phone2 && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ 
                              fontSize: { xs: 13, sm: 14 }, 
                              color: '#8E8E93', 
                              mr: 0.5 
                            }} />
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#8E8E93',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                cursor: 'pointer',
                                transition: 'color 0.2s ease',
                              }}
                              onClick={() => {
                                const cleanPhone = tkApp.phone2!.replace(/\s+/g, '');
                                window.location.href = `tel:${cleanPhone}`;
                              }}
                            >
                              {tkApp.phone2}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    {tkApp.time && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <TimeIcon sx={{ 
                          fontSize: { xs: 13, sm: 14 }, 
                          color: '#8E8E93', 
                          mr: 0.5 
                        }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#8E8E93',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          }}
                        >
                          {tkApp.time}
                        </Typography>
                      </Box>
                    )}
                    
                    {tkApp.info && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <InfoIcon sx={{ 
                          fontSize: { xs: 13, sm: 14 }, 
                          color: '#4CAF50', 
                          mr: 0.5 
                        }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#4CAF50',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                          }}
                        >
                          {tkApp.info}
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
                  <Divider sx={{ mx: 2 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}; 