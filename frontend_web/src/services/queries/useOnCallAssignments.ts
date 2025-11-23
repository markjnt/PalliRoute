import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OnCallAssignment, OnCallAssignmentFormData, EmployeeCapacity } from '../../types/models';
import { oncallAssignmentsApi, OnCallAssignmentsQueryParams } from '../api/oncallAssignments';

// Keys for React Query cache
export const oncallAssignmentKeys = {
  all: ['oncall-assignments'] as const,
  lists: () => [...oncallAssignmentKeys.all, 'list'] as const,
  list: (params?: OnCallAssignmentsQueryParams) => [...oncallAssignmentKeys.lists(), params] as const,
  details: () => [...oncallAssignmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...oncallAssignmentKeys.details(), id] as const,
  capacity: (employeeId: number, month?: number, year?: number) => 
    [...oncallAssignmentKeys.all, 'capacity', employeeId, month, year] as const,
};

// Hook to get all on-call assignments with optional filters
export const useOnCallAssignments = (params?: OnCallAssignmentsQueryParams) => {
  return useQuery({
    queryKey: oncallAssignmentKeys.list(params),
    queryFn: () => oncallAssignmentsApi.getAll(params),
  });
};

// Hook to get a single assignment by ID
export const useOnCallAssignment = (id: number) => {
  return useQuery({
    queryKey: oncallAssignmentKeys.detail(id),
    queryFn: () => oncallAssignmentsApi.getById(id),
    enabled: !!id,
  });
};

// Hook to create an assignment
export const useCreateOnCallAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assignmentData: OnCallAssignmentFormData) => 
      oncallAssignmentsApi.create(assignmentData),
    onSuccess: (newAssignment) => {
      // Invalidate all assignment lists to refetch
      queryClient.invalidateQueries({ queryKey: oncallAssignmentKeys.lists() });
      
      // Invalidate capacity queries for the assigned employee
      if (newAssignment.employee_id) {
        const date = new Date(newAssignment.date);
        queryClient.invalidateQueries({ 
          queryKey: oncallAssignmentKeys.capacity(
            newAssignment.employee_id, 
            date.getMonth() + 1, 
            date.getFullYear()
          ) 
        });
      }
    },
  });
};

// Hook to update an assignment
export const useUpdateOnCallAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, assignmentData }: { id: number; assignmentData: Partial<OnCallAssignmentFormData> }) => 
      oncallAssignmentsApi.update(id, assignmentData),
    onSuccess: (updatedAssignment) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: oncallAssignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: oncallAssignmentKeys.detail(updatedAssignment.id as number) });
      
      // Invalidate capacity queries
      if (updatedAssignment.employee_id) {
        const date = new Date(updatedAssignment.date);
        queryClient.invalidateQueries({ 
          queryKey: oncallAssignmentKeys.capacity(
            updatedAssignment.employee_id, 
            date.getMonth() + 1, 
            date.getFullYear()
          ) 
        });
      }
    },
  });
};

// Hook to delete an assignment
export const useDeleteOnCallAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => oncallAssignmentsApi.delete(id),
    onSuccess: (_, id) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: oncallAssignmentKeys.lists() });
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: oncallAssignmentKeys.detail(id) });
    },
  });
};

// Hook to get employee capacity
export const useEmployeeCapacity = (employeeId: number, month?: number, year?: number) => {
  return useQuery({
    queryKey: oncallAssignmentKeys.capacity(employeeId, month, year),
    queryFn: () => oncallAssignmentsApi.getEmployeeCapacity(employeeId, month, year),
    enabled: !!employeeId,
  });
};

