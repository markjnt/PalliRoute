import { useMemo, useCallback } from 'react';
import { Patient, Appointment, Weekday, Route } from '../types/models';

interface UsePatientManagementProps {
  patients: Patient[];
  appointments: Appointment[];
  selectedDay: Weekday;
  employeeId?: number;
  area?: string;
}

interface PatientManagementReturn {
  // Patient filtering by visit type
  getPatientsByVisitType: (visitType: 'HB' | 'NA' | 'TK' | '') => Patient[];
  hbPatients: Patient[];
  tkPatients: Patient[];
  naPatients: Patient[];
  emptyTypePatients: Patient[];
  
  // Tour employee patients (shown but not in route) - HB and NA only
  tourEmployeePatients: Patient[];
  
  // Normal TK patients (not tour_employee appointments)
  normalTkPatients: Patient[];
  
  // Tour employee TK patients (shown but not in normal TK section)
  tourEmployeeTkPatients: Patient[];
  
  // Patient sorting by route order
  getSortedRoutePatients: (route: Route | undefined) => Patient[];
  
  // Patient appointments
  getPatientAppointments: (patientId: number) => Appointment[];
  
  // Appointments by visit type (returns all appointments, not deduplicated)
  getAppointmentsByVisitType: (visitType: 'HB' | 'NA' | 'TK' | '') => Appointment[];
  hbAppointments: Appointment[];
  naAppointments: Appointment[];
  tkAppointments: Appointment[];
  
  // Normal route appointments (HB + NA, excluding tour_employee appointments)
  normalRouteAppointments: Appointment[];
  
  // Tour employee appointments (shown but not in route) - HB and NA only
  tourEmployeeAppointments: Appointment[];
  
  // Normal TK appointments (not tour_employee appointments)
  normalTkAppointments: Appointment[];
  
  // Tour employee TK appointments (shown but not in normal TK section)
  tourEmployeeTkAppointments: Appointment[];
  
  // Empty type appointments (not tour_employee appointments)
  normalEmptyTypeAppointments: Appointment[];
  
  // Tour employee empty type appointments (shown but not in normal empty type section)
  tourEmployeeEmptyTypeAppointments: Appointment[];
  
  // Check if appointment is tour employee appointment
  isTourEmployeeAppointment: (appointment: Appointment, employeeId?: number) => boolean;
  
  // Patient counts
  getPatientCountByEmployee: (employees: any[]) => Map<number, number>;
  
  // Check if patient has appointments for day
  hasAppointmentsForDay: boolean;
}

export const usePatientManagement = ({
  patients,
  appointments,
  selectedDay,
  employeeId,
  area
}: UsePatientManagementProps): PatientManagementReturn => {
  
  // Filter appointments for current context (employee or area)
  // Include both appointments assigned to employee (employee_id) and tour employee appointments (tour_employee_id)
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (employeeId) {
        // Include appointments assigned to this employee OR tour employee appointments
        return app.weekday === selectedDay && (
          app.employee_id === employeeId || 
          app.tour_employee_id === employeeId
        );
      }
      if (area) {
        return (app.area as string) === area && app.weekday === selectedDay && !app.employee_id;
      }
      return app.weekday === selectedDay;
    });
  }, [appointments, selectedDay, employeeId, area]);
  
  // Check if an appointment is a tour employee appointment (shown but not in route)
  const isTourEmployeeAppointment = useCallback((appointment: Appointment, employeeId?: number): boolean => {
    if (!employeeId) return false;
    return appointment.tour_employee_id === employeeId && appointment.employee_id !== employeeId;
  }, []);

  // Get patients by visit type (deduplicated)
  const getPatientsByVisitType = useCallback((visitType: 'HB' | 'NA' | 'TK' | '') => {
    const typeAppointments = filteredAppointments.filter(app => app.visit_type === visitType);
    const patientIds = Array.from(new Set(typeAppointments.map(a => a.patient_id)));
    return patientIds
      .map(id => patients.find(p => p.id === id))
      .filter((p): p is Patient => p !== undefined);
  }, [filteredAppointments, patients]);

  // Get appointments by visit type (returns all appointments, not deduplicated)
  const getAppointmentsByVisitType = useCallback((visitType: 'HB' | 'NA' | 'TK' | '') => {
    return filteredAppointments.filter(app => app.visit_type === visitType);
  }, [filteredAppointments]);

  // Pre-calculated patient groups
  const hbPatients = useMemo(() => getPatientsByVisitType('HB'), [getPatientsByVisitType]);
  const tkPatients = useMemo(() => getPatientsByVisitType('TK'), [getPatientsByVisitType]);
  const naPatients = useMemo(() => getPatientsByVisitType('NA'), [getPatientsByVisitType]);
  const emptyTypePatients = useMemo(() => getPatientsByVisitType(''), [getPatientsByVisitType]);

  // Get patient appointments for a specific patient
  const getPatientAppointments = useCallback((patientId: number) => {
    return filteredAppointments.filter(a => a.patient_id === patientId);
  }, [filteredAppointments]);

  // Sort route patients (HB + NA) by route order
  // Only include patients with normal appointments (not tour_employee appointments)
  const getSortedRoutePatients = useCallback((route: Route | undefined) => {
    if (!route) {
      // Filter out tour employee patients
      const normalPatients = [...hbPatients, ...naPatients].filter(patient => {
        const patientAppts = getPatientAppointments(patient.id || 0)
          .filter(app => app.visit_type === 'HB' || app.visit_type === 'NA');
        // Only include if patient has at least one normal appointment (not tour_employee)
        return patientAppts.some(app => !isTourEmployeeAppointment(app, employeeId));
      });
      return normalPatients;
    }

    // Create appointment ID to patient mapping (only for normal appointments)
    const appointmentToPatient = new Map<number, Patient>();
    const allRoutePatients = [...hbPatients, ...naPatients];
    
    allRoutePatients.forEach(patient => {
      const patientAppts = getPatientAppointments(patient.id || 0)
        .filter(app => {
          const isHBorNA = app.visit_type === 'HB' || app.visit_type === 'NA';
          const isNormalAppointment = !isTourEmployeeAppointment(app, employeeId);
          return isHBorNA && isNormalAppointment;
        });
      
      patientAppts.forEach(app => {
        if (app.id !== undefined) {
          appointmentToPatient.set(app.id, patient);
        }
      });
    });
    
    // Create ordered patient list based on route order
    const orderedPatients: Patient[] = [];
    
    if (route.route_order) {
      let routeOrder: number[] = [];
      
      if (Array.isArray(route.route_order)) {
        routeOrder = route.route_order;
      } else {
        try {
          const parsedOrder = JSON.parse(route.route_order as unknown as string);
          if (Array.isArray(parsedOrder)) {
            routeOrder = parsedOrder;
          }
        } catch (error) {
          console.error('Failed to parse route_order:', error);
        }
      }
                  
      // Add patients in the order specified by route_order
      for (const appointmentId of routeOrder) {
        const patient = appointmentToPatient.get(appointmentId);
        if (patient && !orderedPatients.includes(patient)) {
          orderedPatients.push(patient);
        }
      }
      
      // Add any remaining HB/NA patients not in the route_order (but not tour_employee patients)
      allRoutePatients.forEach(patient => {
        const patientAppts = getPatientAppointments(patient.id || 0)
          .filter(app => app.visit_type === 'HB' || app.visit_type === 'NA');
        const hasNormalAppointment = patientAppts.some(app => !isTourEmployeeAppointment(app, employeeId));
        if (hasNormalAppointment && !orderedPatients.includes(patient)) {
          orderedPatients.push(patient);
        }
      });
    } else {
      // Filter out tour employee patients
      const normalPatients = allRoutePatients.filter(patient => {
        const patientAppts = getPatientAppointments(patient.id || 0)
          .filter(app => app.visit_type === 'HB' || app.visit_type === 'NA');
        return patientAppts.some(app => !isTourEmployeeAppointment(app, employeeId));
      });
      orderedPatients.push(...normalPatients);
    }
    
    return orderedPatients;
  }, [hbPatients, naPatients, getPatientAppointments, isTourEmployeeAppointment, employeeId]);
  
  // Get tour employee patients (shown but not in route)
  // Only includes HB and NA patients (TK patients are handled separately)
  const tourEmployeePatients = useMemo(() => {
    const tourPatients: Patient[] = [];
    const allPatients = [...hbPatients, ...naPatients];
    
    allPatients.forEach(patient => {
      const patientAppts = getPatientAppointments(patient.id || 0)
        .filter(app => app.visit_type === 'HB' || app.visit_type === 'NA');
      const isTourPatient = patientAppts.some(app => isTourEmployeeAppointment(app, employeeId));
      if (isTourPatient) {
        tourPatients.push(patient);
      }
    });
    
    return tourPatients;
  }, [hbPatients, naPatients, getPatientAppointments, isTourEmployeeAppointment, employeeId]);
  
  // Get normal TK patients (not tour_employee appointments)
  const normalTkPatients = useMemo(() => {
    return tkPatients.filter(patient => {
      const patientAppts = getPatientAppointments(patient.id || 0)
        .filter(app => app.visit_type === 'TK');
      // Only include if patient has at least one normal TK appointment (not tour_employee)
      return patientAppts.some(app => !isTourEmployeeAppointment(app, employeeId));
    });
  }, [tkPatients, getPatientAppointments, isTourEmployeeAppointment, employeeId]);
  
  // Get tour employee TK patients (shown but not in normal TK section)
  const tourEmployeeTkPatients = useMemo(() => {
    return tkPatients.filter(patient => {
      const patientAppts = getPatientAppointments(patient.id || 0)
        .filter(app => app.visit_type === 'TK');
      const isTourPatient = patientAppts.some(app => isTourEmployeeAppointment(app, employeeId));
      return isTourPatient;
    });
  }, [tkPatients, getPatientAppointments, isTourEmployeeAppointment, employeeId]);

  // Get patient count by employee
  const getPatientCountByEmployee = useCallback((employees: any[]) => {
    const counts = new Map<number, number>();
    employees.forEach(emp => {
      counts.set(emp.id || 0, 0);
    });
    
    // Count patients based on their appointments for the selected day
    const patientIdsByEmployee = new Map<number, Set<number>>();
    appointments.forEach(app => {
      if (app.weekday === selectedDay && app.employee_id) {
        if (!patientIdsByEmployee.has(app.employee_id)) {
          patientIdsByEmployee.set(app.employee_id, new Set());
        }
        patientIdsByEmployee.get(app.employee_id)!.add(app.patient_id);
      }
    });
    
    patientIdsByEmployee.forEach((patientIds, employeeId) => {
      counts.set(employeeId, patientIds.size);
    });
    
    return counts;
  }, [appointments, selectedDay]);

  // Check if there are any patients with appointments for the selected day
  const hasAppointmentsForDay = useMemo(() => {
    return hbPatients.length > 0 || tkPatients.length > 0 || naPatients.length > 0 || emptyTypePatients.length > 0;
  }, [hbPatients.length, tkPatients.length, naPatients.length, emptyTypePatients.length]);

  // Pre-calculated appointment groups
  const hbAppointments = useMemo(() => getAppointmentsByVisitType('HB'), [getAppointmentsByVisitType]);
  const naAppointments = useMemo(() => getAppointmentsByVisitType('NA'), [getAppointmentsByVisitType]);
  const tkAppointments = useMemo(() => getAppointmentsByVisitType('TK'), [getAppointmentsByVisitType]);
  const emptyTypeAppointments = useMemo(() => getAppointmentsByVisitType(''), [getAppointmentsByVisitType]);

  // Get normal route appointments (HB + NA, excluding tour_employee appointments)
  const normalRouteAppointments = useMemo(() => {
    return [...hbAppointments, ...naAppointments].filter(app => !isTourEmployeeAppointment(app, employeeId));
  }, [hbAppointments, naAppointments, isTourEmployeeAppointment, employeeId]);

  // Get tour employee appointments (shown but not in route) - HB and NA only
  const tourEmployeeAppointments = useMemo(() => {
    return [...hbAppointments, ...naAppointments].filter(app => isTourEmployeeAppointment(app, employeeId));
  }, [hbAppointments, naAppointments, isTourEmployeeAppointment, employeeId]);

  // Get normal TK appointments (not tour_employee appointments)
  const normalTkAppointments = useMemo(() => {
    return tkAppointments.filter(app => !isTourEmployeeAppointment(app, employeeId));
  }, [tkAppointments, isTourEmployeeAppointment, employeeId]);

  // Get tour employee TK appointments (shown but not in normal TK section)
  const tourEmployeeTkAppointments = useMemo(() => {
    return tkAppointments.filter(app => isTourEmployeeAppointment(app, employeeId));
  }, [tkAppointments, isTourEmployeeAppointment, employeeId]);

  // Get normal empty type appointments (not tour_employee appointments)
  const normalEmptyTypeAppointments = useMemo(() => {
    return emptyTypeAppointments.filter(app => !isTourEmployeeAppointment(app, employeeId));
  }, [emptyTypeAppointments, isTourEmployeeAppointment, employeeId]);

  // Get tour employee empty type appointments (shown but not in normal empty type section)
  const tourEmployeeEmptyTypeAppointments = useMemo(() => {
    return emptyTypeAppointments.filter(app => isTourEmployeeAppointment(app, employeeId));
  }, [emptyTypeAppointments, isTourEmployeeAppointment, employeeId]);

  return {
    getPatientsByVisitType,
    hbPatients,
    tkPatients,
    naPatients,
    emptyTypePatients,
    tourEmployeePatients,
    normalTkPatients,
    tourEmployeeTkPatients,
    getSortedRoutePatients,
    getPatientAppointments,
    getAppointmentsByVisitType,
    hbAppointments,
    naAppointments,
    tkAppointments,
    normalRouteAppointments,
    tourEmployeeAppointments,
    normalTkAppointments,
    tourEmployeeTkAppointments,
    normalEmptyTypeAppointments,
    tourEmployeeEmptyTypeAppointments,
    isTourEmployeeAppointment,
    getPatientCountByEmployee,
    hasAppointmentsForDay
  };
};
