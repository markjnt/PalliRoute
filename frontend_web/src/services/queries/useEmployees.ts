import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Employee, EmployeeFormData, EmployeeImportResponse } from '../../types/models';
import { employeesApi } from '../api/employees';
import { patientKeys } from './usePatients';
import { appointmentKeys } from './useAppointments';
import { routeKeys } from './useRoutes';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';
import { employeePlanningKeys } from './useEmployeePlanning';

// Keys for React Query cache
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: string) => [...employeeKeys.lists(), { filters }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: number) => [...employeeKeys.details(), id] as const,
};

// Hook to get all employees
export const useEmployees = () => {
  return useQuery({
    queryKey: employeeKeys.lists(),
    queryFn: () => employeesApi.getAll(),
  });
};

// Hook to get a single employee
export const useEmployee = (id: number) => {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id, // Only run the query if we have an ID
  });
};

// Hook to create an employee
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (employeeData: EmployeeFormData) => employeesApi.create(employeeData),
    onSuccess: (newEmployee) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      
      // Optionally update the cache directly
      queryClient.setQueryData(
        employeeKeys.lists(),
        (oldEmployees: Employee[] = []) => [...oldEmployees, newEmployee]
      );
    },
  });
};

// Hook to update an employee
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, employeeData }: { id: number; employeeData: Partial<EmployeeFormData> }) => 
      employeesApi.update(id, employeeData),
    onSuccess: (updatedEmployee) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(updatedEmployee.id as number) });
      
      // Optionally update the cache directly
      queryClient.setQueryData(
        employeeKeys.lists(),
        (oldEmployees: Employee[] = []) => 
          oldEmployees.map(employee => (employee.id === updatedEmployee.id ? updatedEmployee : employee))
      );
    },
  });
};

// Hook to delete an employee
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => employeesApi.delete(id),
    onSuccess: (_, id) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });
      
      // Optionally update the list cache directly
      queryClient.setQueryData(
        employeeKeys.lists(),
        (oldEmployees: Employee[] = []) => oldEmployees.filter(employee => employee.id !== id)
      );
    },
  });
};



// Hook to import employees from Excel
export const useImportEmployees = () => {
  const queryClient = useQueryClient();
  const { setLastEmployeeImportTime } = useLastUpdateStore();
  const { clearSelection } = useCalendarWeekStore();
  
  return useMutation({
    mutationFn: () => employeesApi.import(),
    onSuccess: () => {
      // Invalidate employees list to refresh after import
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeePlanningKeys.all });
      
      // Update last import time in store
      setLastEmployeeImportTime(new Date());
      
      // Leere den Kalenderwochen-Store, da Mitarbeiter-Import alle Daten löscht (inkl. Patienten, Termine, Routen)
      clearSelection();
    },
  });
}; 