import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { useRouteCompletionStore, useCompletedStops } from '../../stores/useRouteCompletionStore';
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
  responsibleEmployeeName?: string;  // For tour_employee appointments: shows "Zuständig: [Name]"
  tourEmployeeName?: string;  // For responsible employee: shows "Ursprungstour: [Name]"
  isTourEmployeeAppointment?: boolean;  // Mark tour_employee appointments for styling
  originEmployeeName?: string;  // For replacement appointments: shows "Ursprünglich (Vertretung): [Name]"
  otherResponsibleEmployees?: Array<{ employee: { id?: number; first_name: string; last_name: string }; appointmentId: number }>;  // All other appointments for the same patient on the same day
}



export const RouteList: React.FC = () => {
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { isStopCompleted, toggleStop, setCurrentWeekday, clearAllCompletedStops } = useRouteCompletionStore();
  const completedStops = useCompletedStops();
  
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
      'friday': 'Freitag',
      'saturday': 'Samstag',
      'sunday': 'Sonntag'
    };
    return weekdayMap[weekday] || weekday;
  };

  // Reset completion stops when user or weekend area changes (but not on initial mount)
  const prevUserIdRef = useRef<number | null>(null);
  const prevWeekendAreaRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    // Skip on initial mount - only clear if values actually changed
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevUserIdRef.current = selectedUserId;
      prevWeekendAreaRef.current = selectedWeekendArea;
      return;
    }
    
    // Only clear if the values actually changed
    if (prevUserIdRef.current !== selectedUserId || prevWeekendAreaRef.current !== selectedWeekendArea) {
      clearAllCompletedStops();
      prevUserIdRef.current = selectedUserId;
      prevWeekendAreaRef.current = selectedWeekendArea;
    }
  }, [selectedUserId, selectedWeekendArea, clearAllCompletedStops]);

  // Update current weekday in store and auto-reset when switching days
  useEffect(() => {
    setCurrentWeekday(selectedWeekday);
  }, [selectedWeekday, setCurrentWeekday]);

  // Early return if no user or weekend area is selected
  if (!selectedUserId && !selectedWeekendArea) {
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
            Bitte wählen Sie einen Mitarbeiter oder eine Wochenend-Tour aus
          </Typography>
        </Box>
      </Box>
    );
  }

  // Route für ausgewählten Mitarbeiter oder Wochenend-Bereich anzeigen
  const visibleRoutes = useMemo(() => {
    if (selectedWeekendArea) {
      // Für Wochenend-Touren: Route des ausgewählten Bereichs
      return routes.filter(route => 
        !route.employee_id && 
        route.area === selectedWeekendArea && 
        route.weekday === selectedWeekday
      );
    } else {
      // Für Mitarbeiter: Route des ausgewählten Mitarbeiters
      return routes.filter(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
    }
  }, [routes, selectedUserId, selectedWeekendArea, selectedWeekday]);

  // Create route stops for all visible routes
  const routeStops = useMemo(() => {
    const stops: RouteStop[] = [];
    
    if (!selectedUserId && !selectedWeekendArea) return stops;
    
    visibleRoutes.forEach(route => {
      const routeOrder = parseRouteOrder(route.route_order);
      
      routeOrder.forEach((appointmentId, index) => {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (appointment) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
            // Determine if this is a tour_employee appointment (current user is tour_employee_id but not employee_id)
            const isTourEmployeeAppointment = selectedUserId && 
              appointment.tour_employee_id === selectedUserId && 
              appointment.employee_id !== selectedUserId;
            
            // Get responsible employee name (for tour_employee appointments)
            const responsibleEmployee = isTourEmployeeAppointment && appointment.employee_id
              ? employees.find(e => e.id === appointment.employee_id)
              : null;
            
            // Get all appointments for this patient on the selected day
            const allDayAppointments = appointments.filter(app => 
              app.patient_id === patient.id && 
              app.weekday === selectedWeekday
            );
            
            // Check if there are multiple appointments for this patient on the same day (Multi-Assignment)
            const hasMultipleAppointments = allDayAppointments.length > 1;
            
            // Get tour employee name (for responsible employee appointments)
            // Show tour employee if:
            // 1. tour_employee_id is set
            // 2. Not a tour employee appointment itself
            // 3. Either tour_employee_id is different from employee_id OR there are multiple appointments (Multi-Assignment)
            const tourEmployee = !isTourEmployeeAppointment && appointment.tour_employee_id &&
              (appointment.tour_employee_id !== appointment.employee_id || hasMultipleAppointments)
              ? employees.find(e => e.id === appointment.tour_employee_id)
              : null;
            
            // Get origin employee name (only when different from current employee)
            const showOriginEmployee = appointment.origin_employee_id &&
              appointment.origin_employee_id !== appointment.employee_id;
            const originEmployee = showOriginEmployee
              ? employees.find(e => e.id === appointment.origin_employee_id)
              : null;
            
            // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
            // These are all appointments for the same patient on the same day, excluding the current appointment
            // In Multi-Assignment scenarios, the tour_employee_id may also appear in "Gemeinsam mit"
            const otherResponsibleEmployees = allDayAppointments.length > 1
              ? allDayAppointments
                  .filter(app => 
                    app.id !== appointment.id && 
                    app.employee_id !== appointment.employee_id &&
                    app.employee_id !== null &&
                    app.employee_id !== undefined
                  )
                  .map(app => {
                    const emp = employees.find(e => e.id === app.employee_id);
                    return emp ? { employee: emp, appointmentId: app.id || 0 } : null;
                  })
                  .filter((item): item is { employee: typeof employees[0], appointmentId: number } => item !== null)
                  .filter((item, index, self) => 
                    index === self.findIndex(t => t.employee.id === item.employee.id)
                  )
              : [];
            
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
              responsibleEmployeeName: responsibleEmployee 
                ? `${responsibleEmployee.first_name} ${responsibleEmployee.last_name}`
                : undefined,
              tourEmployeeName: tourEmployee 
                ? `${tourEmployee.first_name} ${tourEmployee.last_name}`
                : undefined,
              originEmployeeName: originEmployee
                ? `${originEmployee.first_name} ${originEmployee.last_name}`
                : undefined,
              otherResponsibleEmployees: otherResponsibleEmployees.length > 0 ? otherResponsibleEmployees : undefined,
            });
          }
        }
      });
    });
    
    return stops;
  }, [visibleRoutes, employees, patients, appointments, selectedUserId, selectedWeekendArea, isStopCompleted]);

  // Get tour employee stops (appointments where tour_employee_id matches but not in route)
  const tourEmployeeStops = useMemo(() => {
    const stops: RouteStop[] = [];
    
    if (!selectedUserId || selectedWeekendArea) return stops; // Only for employee routes
    
    // Get all appointment IDs that are in routes
    const routeAppointmentIds = new Set<number>();
    visibleRoutes.forEach(route => {
      const routeOrder = parseRouteOrder(route.route_order);
      routeOrder.forEach(appointmentId => {
        routeAppointmentIds.add(appointmentId);
      });
    });
    
    // Get all patient IDs that are in normal routes (to filter out duplicates)
    const normalRoutePatientIds = new Set<number>();
    visibleRoutes.forEach(route => {
      const routeOrder = parseRouteOrder(route.route_order);
      routeOrder.forEach(appointmentId => {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (appointment && appointment.patient_id) {
          normalRoutePatientIds.add(appointment.patient_id);
        }
      });
    });
    
    // Find appointments where tour_employee_id matches but appointment is not in route
    // Filter out tour employee appointments that already have a normal route appointment for the same patient
    const tourEmployeeApps = appointments.filter(a => 
      a.tour_employee_id === selectedUserId &&
      a.employee_id !== selectedUserId &&
      (a.visit_type === 'HB' || a.visit_type === 'NA') &&
      a.weekday === selectedWeekday &&
      a.id !== undefined &&
      !routeAppointmentIds.has(a.id) &&
      !normalRoutePatientIds.has(a.patient_id) // Filter out if patient already has a normal route appointment
    );
    
    // Group appointments by patient_id to avoid duplicates (like in web version)
    const appointmentsByPatient = new Map<number, typeof tourEmployeeApps>();
    tourEmployeeApps.forEach(app => {
      const patientId = app.patient_id;
      if (!appointmentsByPatient.has(patientId)) {
        appointmentsByPatient.set(patientId, []);
      }
      appointmentsByPatient.get(patientId)!.push(app);
    });
    
    // Create one stop per patient (grouped)
    Array.from(appointmentsByPatient.entries()).forEach(([patientId, patientAppts]) => {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;
      
      // Use the first appointment for display
      const appointment = patientAppts[0];
      const isMultiple = patientAppts.length > 1;
      
      const responsibleEmployee = appointment.employee_id
        ? employees.find(e => e.id === appointment.employee_id)
        : null;
      const showOriginEmployee = appointment.origin_employee_id &&
        appointment.origin_employee_id !== appointment.employee_id;
      const originEmployee = showOriginEmployee
        ? employees.find(e => e.id === appointment.origin_employee_id)
        : null;
      
      // Get all appointments for this patient on the selected day
      const allDayAppointments = appointments.filter(app => 
        app.patient_id === patient.id && 
        app.weekday === selectedWeekday
      );
      
      // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
      const otherResponsibleEmployees = allDayAppointments.length > 1
        ? allDayAppointments
            .filter(app => 
              app.id !== appointment.id &&
              app.employee_id !== appointment.employee_id &&
              app.employee_id !== null &&
              app.employee_id !== undefined
            )
            .map(app => {
              const emp = employees.find(e => e.id === app.employee_id);
              return emp ? { employee: emp, appointmentId: app.id || 0 } : null;
            })
            .filter((item): item is { employee: typeof employees[0], appointmentId: number } => item !== null)
            .filter((item, index, self) => 
              index === self.findIndex(t => t.employee.id === item.employee.id)
            )
        : [];
      
      stops.push({
        id: appointment.id || 0,
        position: 0, // No position for tour employee stops
        patientName: `${patient.first_name} ${patient.last_name}`,
        address: `${patient.street}, ${patient.zip_code} ${patient.city}`,
        visitType: appointment.visit_type,
        time: appointment.time,
        phone1: patient.phone1,
        phone2: patient.phone2,
        info: appointment.info,
        isCompleted: isStopCompleted(appointment.id || 0),
        responsibleEmployeeName: responsibleEmployee 
          ? `${responsibleEmployee.first_name} ${responsibleEmployee.last_name}`
          : undefined,
        isTourEmployeeAppointment: true, // Mark as tour employee appointment
        originEmployeeName: originEmployee
          ? `${originEmployee.first_name} ${originEmployee.last_name}`
          : undefined,
        otherResponsibleEmployees: otherResponsibleEmployees.length > 0 ? otherResponsibleEmployees : undefined,
      });
    });
    
    return stops;
  }, [appointments, patients, employees, selectedUserId, selectedWeekday, visibleRoutes, isStopCompleted]);

  // Get TK appointments (phone calls) for the selected employee/area and day
  const tkAppointments = useMemo(() => {
    if (!selectedUserId && !selectedWeekendArea) return [];
    
    const allTkApps = appointments.filter(a => {
      if (selectedWeekendArea) {
        // Für Wochenend-Touren: TK-Termine für den ausgewählten Bereich und Wochentag
        return a.weekday === selectedWeekday && 
               a.area === selectedWeekendArea && 
               a.visit_type === 'TK';
      } else {
        // Für Mitarbeiter: TK-Termine des ausgewählten Mitarbeiters (employee_id ODER tour_employee_id)
        return a.weekday === selectedWeekday && 
               a.visit_type === 'TK' &&
               (a.employee_id === selectedUserId || a.tour_employee_id === selectedUserId);
      }
    });
    
    // Separate normal TK appointments and tour employee TK appointments
    const normalTkApps = allTkApps.filter(a => {
      if (selectedWeekendArea) return true; // All are normal for weekend areas
      return !(a.tour_employee_id === selectedUserId && a.employee_id !== selectedUserId);
    });
    
    const tourEmployeeTkApps = selectedWeekendArea ? [] : allTkApps.filter(a => 
      a.tour_employee_id === selectedUserId && 
      a.employee_id !== selectedUserId
    );
    
    // Get all patient IDs that have normal TK appointments (to filter out duplicates)
    const normalTkPatientIds = new Set(normalTkApps.map(app => app.patient_id));
    
    // Filter out tour employee TK appointments that already have a normal TK appointment for the same patient
    const filteredTourEmployeeTkApps = tourEmployeeTkApps.filter(
      app => !normalTkPatientIds.has(app.patient_id)
    );
    
    // Group normal TK appointments by patient_id to avoid duplicates
    const normalTkByPatient = new Map<number, typeof normalTkApps>();
    normalTkApps.forEach(app => {
      const patientId = app.patient_id;
      if (!normalTkByPatient.has(patientId)) {
        normalTkByPatient.set(patientId, []);
      }
      normalTkByPatient.get(patientId)!.push(app);
    });
    
    // Group tour employee TK appointments by patient_id to avoid duplicates
    const tourEmployeeTkByPatient = new Map<number, typeof filteredTourEmployeeTkApps>();
    filteredTourEmployeeTkApps.forEach(app => {
      const patientId = app.patient_id;
      if (!tourEmployeeTkByPatient.has(patientId)) {
        tourEmployeeTkByPatient.set(patientId, []);
      }
      tourEmployeeTkByPatient.get(patientId)!.push(app);
    });
    
    // Get all unique patient IDs
    const allTkPatientIds = new Set([...normalTkByPatient.keys(), ...tourEmployeeTkByPatient.keys()]);
    
    // Build result array - one entry per patient
    const result: Array<{
      id: number;
      patientName: string;
      phone1?: string;
      phone2?: string;
      time?: string;
      info?: string;
      isCompleted: boolean;
      responsibleEmployeeName?: string;
      tourEmployeeName?: string;
      isTourEmployeeAppointment: boolean;
      originEmployeeName?: string;
      otherResponsibleEmployees?: Array<{ employee: typeof employees[0], appointmentId: number }>;
    }> = [];
    
    allTkPatientIds.forEach(patientId => {
      const normalTkAppts = normalTkByPatient.get(patientId) || [];
      const tourEmployeeTkAppts = tourEmployeeTkByPatient.get(patientId) || [];
      
      // If there are normal TK appointments, show them and include tour employee appointments
      if (normalTkAppts.length > 0) {
        // Use first appointment for display (grouped by patient)
        const appointment = normalTkAppts[0];
        const patient = patients.find(p => p.id === appointment.patient_id);
        if (!patient) return;
        
        const isTourEmployeeAppointment = false; // Normal TK appointments
        const tourEmployee = appointment.tour_employee_id
          ? employees.find(e => e.id === appointment.tour_employee_id)
          : null;
        
        const showOriginEmployee = appointment.origin_employee_id &&
          appointment.origin_employee_id !== appointment.employee_id;
        const originEmployee = showOriginEmployee
          ? employees.find(e => e.id === appointment.origin_employee_id)
          : null;
        
        // Get all appointments for this patient on the selected day
        const allDayAppointments = appointments.filter(app => 
          app.patient_id === patient.id && 
          app.weekday === selectedWeekday
        );
        
        // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
        const otherResponsibleEmployees = allDayAppointments.length > 1
          ? allDayAppointments
              .filter(app => 
                app.id !== appointment.id &&
                app.employee_id !== appointment.employee_id &&
                app.employee_id !== null &&
                app.employee_id !== undefined
              )
              .map(app => {
                const emp = employees.find(e => e.id === app.employee_id);
                return emp ? { employee: emp, appointmentId: app.id || 0 } : null;
              })
              .filter((item): item is { employee: typeof employees[0], appointmentId: number } => item !== null)
              .filter((item, index, self) => 
                index === self.findIndex(t => t.employee.id === item.employee.id)
              )
          : [];
        
        result.push({
          id: appointment.id || 0,
          patientName: `${patient.first_name} ${patient.last_name}`,
          phone1: patient.phone1,
          phone2: patient.phone2,
          time: appointment.time,
          info: appointment.info,
          isCompleted: isStopCompleted(appointment.id || 0),
          responsibleEmployeeName: undefined,
          tourEmployeeName: tourEmployee 
            ? `${tourEmployee.first_name} ${tourEmployee.last_name}`
            : undefined,
          isTourEmployeeAppointment: false,
          originEmployeeName: originEmployee
            ? `${originEmployee.first_name} ${originEmployee.last_name}`
            : undefined,
          otherResponsibleEmployees: otherResponsibleEmployees.length > 0 ? otherResponsibleEmployees : undefined,
        });
      } else if (tourEmployeeTkAppts.length > 0) {
        // Only tour employee TK appointments (no normal ones)
        // Use first appointment for display (grouped by patient)
        const appointment = tourEmployeeTkAppts[0];
        const patient = patients.find(p => p.id === appointment.patient_id);
        if (!patient) return;
        
        const isTourEmployeeAppointment = true;
        const responsibleEmployee = appointment.employee_id
          ? employees.find(e => e.id === appointment.employee_id)
          : null;
        
        const showOriginEmployee = appointment.origin_employee_id &&
          appointment.origin_employee_id !== appointment.employee_id;
        const originEmployee = showOriginEmployee
          ? employees.find(e => e.id === appointment.origin_employee_id)
          : null;
        
        // Get all appointments for this patient on the selected day
        const allDayAppointments = appointments.filter(app => 
          app.patient_id === patient.id && 
          app.weekday === selectedWeekday
        );
        
        // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
        const otherResponsibleEmployees = allDayAppointments.length > 1
          ? allDayAppointments
              .filter(app => 
                app.id !== appointment.id &&
                app.employee_id !== appointment.employee_id &&
                app.employee_id !== null &&
                app.employee_id !== undefined
              )
              .map(app => {
                const emp = employees.find(e => e.id === app.employee_id);
                return emp ? { employee: emp, appointmentId: app.id || 0 } : null;
              })
              .filter((item): item is { employee: typeof employees[0], appointmentId: number } => item !== null)
              .filter((item, index, self) => 
                index === self.findIndex(t => t.employee.id === item.employee.id)
              )
          : [];
        
        result.push({
          id: appointment.id || 0,
          patientName: `${patient.first_name} ${patient.last_name}`,
          phone1: patient.phone1,
          phone2: patient.phone2,
          time: appointment.time,
          info: appointment.info,
          isCompleted: isStopCompleted(appointment.id || 0),
          responsibleEmployeeName: responsibleEmployee 
            ? `${responsibleEmployee.first_name} ${responsibleEmployee.last_name}`
            : undefined,
          tourEmployeeName: undefined,
          isTourEmployeeAppointment: true,
          originEmployeeName: originEmployee
            ? `${originEmployee.first_name} ${originEmployee.last_name}`
            : undefined,
          otherResponsibleEmployees: otherResponsibleEmployees.length > 0 ? otherResponsibleEmployees : undefined,
        });
      }
    });
    
    return result.sort((a, b) => {
      // Sortiere: tour_employee Termine ans Ende
      if (a.isTourEmployeeAppointment && !b.isTourEmployeeAppointment) return 1;
      if (!a.isTourEmployeeAppointment && b.isTourEmployeeAppointment) return -1;
      return 0;
    });
  }, [appointments, selectedUserId, selectedWeekendArea, selectedWeekday, patients, employees, isStopCompleted]);

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

  // Check if there's anything to display
  const hasContent = routeStops.length > 0 || tourEmployeeStops.length > 0 || tkAppointments.length > 0;

  if (!hasContent) {
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
      {(routeStops.length > 0 || tourEmployeeStops.length > 0) && (
        <Box
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Route Progress Header - only show if there are route stops */}
          {routeStops.length > 0 && (
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
          )}
          {routeStops.map((stop, index) => (
            <React.Fragment key={stop.id}>
              <RouteStopItem
                stop={stop}
                index={index}
                moveStop={moveStop}
                onToggle={handleStopToggle}
              />
              {index < routeStops.length - 1 && (
                <Divider sx={{ mx: 1.5 }} />
              )}
            </React.Fragment>
          ))}
          
          {/* Tour Employee Stops (shown but not in route) */}
          {tourEmployeeStops.length > 0 && (
            <>
              {routeStops.length > 0 && <Divider sx={{ mx: 1.5, my: 1 }} />}
              {tourEmployeeStops.map((stop, index) => (
                <React.Fragment key={`tour-${stop.id}`}>
                  <RouteStopItem
                    stop={stop}
                    index={routeStops.length + index}
                    moveStop={() => {}} // Disable drag & drop for tour employee stops
                    onToggle={handleStopToggle}
                  />
                  {index < tourEmployeeStops.length - 1 && (
                    <Divider sx={{ mx: 1.5 }} />
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </Box>
      )}

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
            {tkAppointments.map((tkApp, index) => {
              const tkAppCompleted = completedStops.has(tkApp.id);
              return (
              <Box 
                key={tkApp.id}
                sx={{
                  opacity: tkApp.isTourEmployeeAppointment ? 0.5 : 1,
                  filter: tkApp.isTourEmployeeAppointment ? 'grayscale(0.3)' : 'none',
                }}
              >
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
                      bgcolor: tkAppCompleted ? '#34C759' : '#4CAF50',
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
                          color: tkAppCompleted ? '#8E8E93' : '#1d1d1f',
                          textDecoration: tkAppCompleted ? 'line-through' : 'none',
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
                    
                    {/* Zuständig anzeigen (nur beim tour_employee) */}
                    {tkApp.responsibleEmployeeName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#007AFF',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          Zuständig: {tkApp.responsibleEmployeeName}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Ursprungstour anzeigen (nur beim zuständigen Mitarbeiter) */}
                    {tkApp.tourEmployeeName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#007AFF',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          Ursprungstour: {tkApp.tourEmployeeName}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Ursprünglich (Vertretung) anzeigen */}
                    {tkApp.originEmployeeName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#007AFF',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          Ursprünglich (Vertretung): {tkApp.originEmployeeName}
                        </Typography>
                      </Box>
                    )}
                    
                    {tkApp.info && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <InfoIcon sx={{ fontSize: 14, color: '#007AFF', mr: 0.5 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#007AFF',
                            fontSize: '0.75rem',
                            bgcolor: 'rgba(0, 122, 255, 0.1)',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                          }}
                        >
                          {tkApp.info}
                        </Typography>
                      </Box>
                    )}
                    
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
                  </Box>

                  {/* Checkbox */}
                  {!tkApp.isTourEmployeeAppointment && (
                    <Checkbox
                      checked={tkAppCompleted}
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
                  )}
                </Box>
                
                {index < tkAppointments.length - 1 && (
                  <Divider sx={{ mx: 2 }} />
                )}
              </Box>
            );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}; 