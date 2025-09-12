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
  
  // Patient sorting by route order
  getSortedRoutePatients: (route: Route | undefined) => Patient[];
  
  // Patient appointments
  getPatientAppointments: (patientId: number) => Appointment[];
  
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
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (employeeId) {
        return app.employee_id === employeeId && app.weekday === selectedDay;
      }
      if (area) {
        return (app.area as string) === area && app.weekday === selectedDay && !app.employee_id;
      }
      return app.weekday === selectedDay;
    });
  }, [appointments, selectedDay, employeeId, area]);

  // Get patients by visit type
  const getPatientsByVisitType = useCallback((visitType: 'HB' | 'NA' | 'TK' | '') => {
    const typeAppointments = filteredAppointments.filter(app => app.visit_type === visitType);
    const patientIds = Array.from(new Set(typeAppointments.map(a => a.patient_id)));
    return patientIds
      .map(id => patients.find(p => p.id === id))
      .filter((p): p is Patient => p !== undefined);
  }, [filteredAppointments, patients]);

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
  const getSortedRoutePatients = useCallback((route: Route | undefined) => {
    if (!route) return [...hbPatients, ...naPatients];

    // Create appointment ID to patient mapping
    const appointmentToPatient = new Map<number, Patient>();
    const allRoutePatients = [...hbPatients, ...naPatients];
    
    allRoutePatients.forEach(patient => {
      const patientAppts = getPatientAppointments(patient.id || 0)
        .filter(app => app.visit_type === 'HB' || app.visit_type === 'NA');
      
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
      
      // Add any remaining HB/NA patients not in the route_order
      allRoutePatients.forEach(patient => {
        if (!orderedPatients.includes(patient)) {
          orderedPatients.push(patient);
        }
      });
    } else {
      orderedPatients.push(...allRoutePatients);
    }
    
    return orderedPatients;
  }, [hbPatients, naPatients, getPatientAppointments]);

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

  return {
    getPatientsByVisitType,
    hbPatients,
    tkPatients,
    naPatients,
    emptyTypePatients,
    getSortedRoutePatients,
    getPatientAppointments,
    getPatientCountByEmployee,
    hasAppointmentsForDay
  };
};
