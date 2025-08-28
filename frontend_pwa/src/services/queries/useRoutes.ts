import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Weekday } from '../../types/models';
import { routesApi } from '../api/routes';

// Keys for React Query cache
export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  list: (filters: any) => [...routeKeys.lists(), { filters }] as const,
  details: () => [...routeKeys.all, 'detail'] as const,
  detail: (id: number) => [...routeKeys.details(), id] as const,
  byDay: () => [...routeKeys.all, 'byDay'] as const,
  forDay: (date: string, employeeId?: number) => 
    [...routeKeys.byDay(), date, { employeeId }] as const,
};

// Hook to get all routes with optional filtering
export const useRoutes = (params?: {
  employee_id?: number;
  weekday?: Weekday;
  date?: string;
}) => {
  return useQuery({
    queryKey: routeKeys.list(params),
    queryFn: () => routesApi.getRoutes(params),
  });
};

// Hook to get a single route by ID
export const useRoute = (id: number) => {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => routesApi.getRouteById(id),
    enabled: !!id, // Only run the query if we have an ID
  });
};

// Hook to get routes for a specific day and optionally an employee
export const useRoutesForDay = (date: string, employeeId?: number) => {
  return useQuery({
    queryKey: routeKeys.forDay(date, employeeId),
    queryFn: () => routesApi.getRoutesForDay(date, employeeId),
    enabled: !!date, // Only run the query if we have a date
  });
};

// Hook to optimize routes for a specific day
export const useOptimizeRoutes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ weekday, employeeId }: { weekday: string; employeeId: number }) => 
      routesApi.optimizeRoutes(weekday, employeeId),
    onSuccess: () => {
      // Invalidate all route queries as they might be affected
      queryClient.invalidateQueries({ 
        queryKey: routeKeys.byDay(),
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
};

// Hook to reorder an appointment in a route using direction or index
export const useReorderAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      routeId, 
      appointmentId, 
      direction,
      index
    }: { 
      routeId: number; 
      appointmentId: number; 
      direction?: 'up' | 'down';
      index?: number;
    }) => routesApi.reorderAppointment(routeId, appointmentId, { direction, index }),
    onSuccess: (updatedRoute) => {
      // Invalidate the specific route
      queryClient.invalidateQueries({ 
        queryKey: routeKeys.detail(updatedRoute.id)
      });
      
      // Also invalidate any lists that might contain this route
      queryClient.invalidateQueries({ 
        queryKey: routeKeys.lists(),
        exact: false 
      });
    },
  });
}; 