import { useMemo, useCallback } from 'react';
import { Employee, Appointment, Weekday } from '../types/models';

interface UseEmployeeManagementProps {
  employees: Employee[];
  appointments: Appointment[];
  selectedDay: Weekday;
  currentArea?: string;
}

interface EmployeeManagementReturn {
  // Filter and sort employees
  getFilteredEmployees: () => Employee[];
  getSortedEmployees: () => Employee[];
  
  // Separate employees by type and patient status
  getEmployeesWithPatients: () => Employee[];
  getEmployeesWithoutPatients: () => Employee[];
  getDoctorsWithPatients: () => Employee[];
  getDoctorsWithoutPatients: () => Employee[];
  getOtherEmployeesWithPatients: () => Employee[];
  getOtherEmployeesWithoutPatients: () => Employee[];
  
  // Employee utilities
  hasPatientInEmployee: (employeeId: number) => boolean;
  getAvailableEmployees: (excludeEmployeeId?: number) => Employee[];
}

export const useEmployeeManagement = ({
  employees,
  appointments,
  selectedDay,
  currentArea
}: UseEmployeeManagementProps): EmployeeManagementReturn => {
  
  // Filter employees by area
  const getFilteredEmployees = useCallback(() => {
    if (!currentArea || currentArea === 'Nord- und Südkreis') {
      return employees;
    }
    return employees.filter(e => e.area === currentArea);
  }, [employees, currentArea]);

  // Sort employees by area and name
  const getSortedEmployees = useCallback(() => {
    return [...getFilteredEmployees()].sort((a, b) => {
      // First sort by area (Nordkreis first, then Südkreis)
      const getAreaOrder = (area?: string) => {
        if (!area) return 2;
        if (area.includes('Nordkreis')) return 0;
        if (area.includes('Südkreis')) return 1;
        return 2;
      };
      
      const areaOrderA = getAreaOrder(a.area);
      const areaOrderB = getAreaOrder(b.area);
      
      if (areaOrderA !== areaOrderB) {
        return areaOrderA - areaOrderB;
      }
      
      // Then sort alphabetically by last name
      return a.last_name.localeCompare(b.last_name);
    });
  }, [getFilteredEmployees]);

  // Check if employee has patients for the selected day
  const hasPatientInEmployee = useCallback((employeeId: number) => {
    return appointments.some(app => {
      if (app.weekday === selectedDay && app.employee_id) {
        return app.employee_id === employeeId;
      }
      return false;
    });
  }, [appointments, selectedDay]);

  // Get all employees
  const allEmployees = useMemo(() => getSortedEmployees(), [getSortedEmployees]);

  // Separate doctors from other employees
  const doctors = useMemo(() => 
    allEmployees.filter(e => e.function === 'Arzt' || e.function === 'Honorararzt'),
    [allEmployees]
  );
  
  const otherEmployees = useMemo(() => 
    allEmployees.filter(e => e.function !== 'Arzt' && e.function !== 'Honorararzt'),
    [allEmployees]
  );

  // Get employees with patients
  const getEmployeesWithPatients = useCallback(() => {
    return allEmployees.filter(emp => hasPatientInEmployee(emp.id || 0));
  }, [allEmployees, hasPatientInEmployee]);

  // Get employees without patients
  const getEmployeesWithoutPatients = useCallback(() => {
    return allEmployees.filter(emp => !hasPatientInEmployee(emp.id || 0));
  }, [allEmployees, hasPatientInEmployee]);

  // Get doctors with patients
  const getDoctorsWithPatients = useCallback(() => {
    return doctors.filter(doctor => hasPatientInEmployee(doctor.id || 0));
  }, [doctors, hasPatientInEmployee]);

  // Get doctors without patients
  const getDoctorsWithoutPatients = useCallback(() => {
    return doctors.filter(doctor => !hasPatientInEmployee(doctor.id || 0));
  }, [doctors, hasPatientInEmployee]);

  // Get other employees with patients
  const getOtherEmployeesWithPatients = useCallback(() => {
    return otherEmployees.filter(emp => hasPatientInEmployee(emp.id || 0));
  }, [otherEmployees, hasPatientInEmployee]);

  // Get other employees without patients
  const getOtherEmployeesWithoutPatients = useCallback(() => {
    return otherEmployees.filter(emp => !hasPatientInEmployee(emp.id || 0));
  }, [otherEmployees, hasPatientInEmployee]);

  // Get available employees for reassignment (excluding current employee)
  const getAvailableEmployees = useCallback((excludeEmployeeId?: number) => {
    return allEmployees
      .filter(emp => emp.id !== excludeEmployeeId)
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [allEmployees]);

  return {
    getFilteredEmployees,
    getSortedEmployees,
    getEmployeesWithPatients,
    getEmployeesWithoutPatients,
    getDoctorsWithPatients,
    getDoctorsWithoutPatients,
    getOtherEmployeesWithPatients,
    getOtherEmployeesWithoutPatients,
    hasPatientInEmployee,
    getAvailableEmployees
  };
};
