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

// Hook to create a new route
export const useCreateRoute = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (routeData: Partial<Route>) => routesApi.createRoute(routeData),
    onSuccess: (newRoute) => {
      // Invalidate and refetch all routes
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      
      // Invalidate any potentially affected day-specific queries
      if (newRoute && 'weekday' in newRoute) {
        // If we have date-based queries that might be affected, invalidate them
        queryClient.invalidateQueries({ 
          queryKey: routeKeys.byDay(),
          // We don't know exact date, so we invalidate all by-day queries
          exact: false 
        });
      }
    },
  });
};

// Hook to update a route
export const useUpdateRoute = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, routeData }: { id: number; routeData: Partial<Route> }) => 
      routesApi.updateRoute(id, routeData),
    onSuccess: (updatedRoute) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(updatedRoute.id) });
      
      // Invalidate any day-specific queries that might be affected
      queryClient.invalidateQueries({ 
        queryKey: routeKeys.byDay(),
        // We don't know exact date, so we invalidate all by-day queries
        exact: false 
      });
    },
  });
};

// Hook to delete a route
export const useDeleteRoute = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => routesApi.deleteRoute(id),
    onSuccess: (_, id) => {
      // Invalidate and refetch route lists
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      
      // Remove the specific route from cache
      queryClient.removeQueries({ queryKey: routeKeys.detail(id) });
      
      // Invalidate day-specific queries
      queryClient.invalidateQueries({ 
        queryKey: routeKeys.byDay(),
        exact: false 
      });
    },
  });
};

// Hook to optimize routes for a specific day
export const useOptimizeRoutes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ date, employeeId }: { date: string; employeeId: number }) => 
      routesApi.optimizeRoutes(date, employeeId),
    onSuccess: (_, { date }) => {
      // Invalidate queries for this specific day
      queryClient.invalidateQueries({ 
        queryKey: routeKeys.byDay(),
        // invalidate all day-specific queries
        exact: false 
      });
      
      // Also invalidate general route lists as they might be affected
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}; 