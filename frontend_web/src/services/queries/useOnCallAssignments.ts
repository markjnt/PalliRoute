import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OnCallAssignment, OnCallAssignmentFormData, EmployeeCapacity } from '../../types/models';
import { oncallAssignmentsApi, OnCallAssignmentsQueryParams } from '../api/oncallAssignments';
import { routeKeys } from './useRoutes';

// Keys for React Query cache
export const oncallAssignmentKeys = {
  all: ['oncall-assignments'] as const,
  lists: () => [...oncallAssignmentKeys.all, 'list'] as const,
  list: (params?: OnCallAssignmentsQueryParams) => [...oncallAssignmentKeys.lists(), params] as const,
  details: () => [...oncallAssignmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...oncallAssignmentKeys.details(), id] as const,
  allCapacities: (month?: number, year?: number) => [...oncallAssignmentKeys.all, 'all-capacities', month, year] as const,
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
      
      // Invalidate all capacity queries (both all and individual)
      queryClient.invalidateQueries({ 
        queryKey: [...oncallAssignmentKeys.all, 'capacity'] 
      });
      
      // Invalidate route queries if this is an AW assignment (affects weekend routes)
      if (newAssignment.duty_type === 'aw_nursing') {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
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
      
      // Invalidate all capacity queries (both all and individual)
      queryClient.invalidateQueries({ 
        queryKey: [...oncallAssignmentKeys.all, 'capacity'] 
      });
      
      // Invalidate route queries if this is an AW assignment (affects weekend routes)
      if (updatedAssignment.duty_type === 'aw_nursing') {
        queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      }
    },
  });
};

// Hook to delete an assignment
export const useDeleteOnCallAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => oncallAssignmentsApi.delete(id),
    onMutate: async (id) => {
      // Get the assignment from cache before deletion to check if it's an AW assignment
      const cachedAssignment = queryClient.getQueryData<OnCallAssignment>(
        oncallAssignmentKeys.detail(id)
      );
      return { wasAwAssignment: cachedAssignment?.duty_type === 'aw_nursing' };
    },
    onSuccess: (_, id, context) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: oncallAssignmentKeys.lists() });
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: oncallAssignmentKeys.detail(id) });
      
      // Invalidate all capacity queries (both all and individual)
      queryClient.invalidateQueries({ 
        queryKey: [...oncallAssignmentKeys.all, 'capacity'] 
      });
      
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
};

// Hook to get capacity for all employees
export const useAllEmployeesCapacity = (month?: number, year?: number) => {
  return useQuery({
    queryKey: [...oncallAssignmentKeys.all, 'capacity', 'all', month, year],
    queryFn: () => oncallAssignmentsApi.getAllEmployeesCapacity(month, year),
  });
};


