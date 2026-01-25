import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ShiftDefinition,
    ShiftInstance,
    EmployeeCapacity,
    Assignment,
} from '../../types/models';
import {
    schedulingApi,
    ShiftDefinitionsQueryParams,
    ShiftInstancesQueryParams,
    EmployeeCapacitiesQueryParams,
    AssignmentsQueryParams,
    CreateShiftDefinitionData,
    CreateShiftInstanceData,
    GenerateShiftInstancesData,
    CreateAssignmentData,
    UpdateAssignmentData,
    AutoPlanData,
    ResetPlanningData,
} from '../api/scheduling';
import { routeKeys } from './useRoutes';

// Keys for React Query cache
export const schedulingKeys = {
    all: ['scheduling'] as const,
    shiftDefinitions: {
        all: ['scheduling', 'shift-definitions'] as const,
        lists: () => [...schedulingKeys.shiftDefinitions.all, 'list'] as const,
        list: (params?: ShiftDefinitionsQueryParams) => [...schedulingKeys.shiftDefinitions.lists(), params] as const,
    },
    shiftInstances: {
        all: ['scheduling', 'shift-instances'] as const,
        lists: () => [...schedulingKeys.shiftInstances.all, 'list'] as const,
        list: (params?: ShiftInstancesQueryParams) => [...schedulingKeys.shiftInstances.lists(), params] as const,
    },
    employeeCapacities: {
        all: ['scheduling', 'employee-capacities'] as const,
        lists: () => [...schedulingKeys.employeeCapacities.all, 'list'] as const,
        list: (params?: EmployeeCapacitiesQueryParams) => [...schedulingKeys.employeeCapacities.lists(), params] as const,
    },
    assignments: {
        all: ['scheduling', 'assignments'] as const,
        lists: () => [...schedulingKeys.assignments.all, 'list'] as const,
        list: (params?: AssignmentsQueryParams) => [...schedulingKeys.assignments.lists(), params] as const,
        details: () => [...schedulingKeys.assignments.all, 'detail'] as const,
        detail: (id: number) => [...schedulingKeys.assignments.details(), id] as const,
    },
};

// Shift Definitions hooks
export const useShiftDefinitions = (params?: ShiftDefinitionsQueryParams) => {
    return useQuery({
        queryKey: schedulingKeys.shiftDefinitions.list(params),
        queryFn: () => schedulingApi.getShiftDefinitions(params),
    });
};

export const useCreateShiftDefinition = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateShiftDefinitionData) => schedulingApi.createShiftDefinition(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schedulingKeys.shiftDefinitions.lists() });
        },
    });
};

// Shift Instances hooks
export const useShiftInstances = (params?: ShiftInstancesQueryParams) => {
    return useQuery({
        queryKey: schedulingKeys.shiftInstances.list(params),
        queryFn: () => schedulingApi.getShiftInstances(params),
    });
};

export const useCreateShiftInstance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateShiftInstanceData) => schedulingApi.createShiftInstance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schedulingKeys.shiftInstances.lists() });
        },
    });
};

export const useGenerateShiftInstances = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: GenerateShiftInstancesData) => schedulingApi.generateShiftInstances(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schedulingKeys.shiftInstances.lists() });
        },
    });
};

// Employee Capacities hooks
export const useEmployeeCapacities = (params?: EmployeeCapacitiesQueryParams) => {
    return useQuery({
        queryKey: schedulingKeys.employeeCapacities.list(params),
        queryFn: () => schedulingApi.getEmployeeCapacities(params),
    });
};

// Assignments hooks
export const useAssignments = (params?: AssignmentsQueryParams) => {
    return useQuery({
        queryKey: schedulingKeys.assignments.list(params),
        queryFn: () => schedulingApi.getAssignments(params),
    });
};

export const useCreateAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateAssignmentData) => schedulingApi.createAssignment(data),
        onSuccess: (newAssignment) => {
            queryClient.invalidateQueries({ queryKey: schedulingKeys.assignments.lists() });
            queryClient.invalidateQueries({ queryKey: schedulingKeys.employeeCapacities.lists() });

            // Invalidate route queries if this is an AW assignment (affects weekend routes)
            if (newAssignment.shift_definition?.category === 'AW') {
                queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
            }
        },
    });
};

export const useUpdateAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateAssignmentData }) =>
            schedulingApi.updateAssignment(id, data),
        onSuccess: (updatedAssignment) => {
            queryClient.invalidateQueries({ queryKey: schedulingKeys.assignments.lists() });
            queryClient.invalidateQueries({ queryKey: schedulingKeys.employeeCapacities.lists() });

            // Invalidate route queries if this is an AW assignment
            if (updatedAssignment.shift_definition?.category === 'AW') {
                queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
            }
        },
    });
};

export const useDeleteAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => schedulingApi.deleteAssignment(id),
        onMutate: async (id) => {
            // Get the assignment from cache before deletion to check if it's an AW assignment
            const cachedAssignments = queryClient.getQueryData<Assignment[]>(
                schedulingKeys.assignments.lists()
            );
            const cachedAssignment = cachedAssignments?.find(a => a.id === id);
            return { wasAwAssignment: cachedAssignment?.shift_definition?.category === 'AW' };
        },
        onSuccess: (_, id, context) => {
            queryClient.invalidateQueries({ queryKey: schedulingKeys.assignments.lists() });
            queryClient.invalidateQueries({ queryKey: schedulingKeys.employeeCapacities.lists() });

            // Invalidate route queries if this was an AW assignment
            if (context?.wasAwAssignment) {
                queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
            }
        },
    });
};

// Auto Plan hook
export const useAutoPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AutoPlanData) => schedulingApi.autoPlan(data),
        onSuccess: () => {
            // Invalidate all assignment lists to refetch after planning
            queryClient.invalidateQueries({ queryKey: schedulingKeys.assignments.lists() });
            queryClient.invalidateQueries({ queryKey: schedulingKeys.employeeCapacities.lists() });
            queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
        },
    });
};

// Reset Planning hook
export const useResetPlanning = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ResetPlanningData) => schedulingApi.resetPlanning(data),
        onSuccess: () => {
            // Invalidate all assignment lists to refetch after reset
            queryClient.invalidateQueries({ queryKey: schedulingKeys.assignments.lists() });
            queryClient.invalidateQueries({ queryKey: schedulingKeys.employeeCapacities.lists() });
            queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
        },
    });
};
