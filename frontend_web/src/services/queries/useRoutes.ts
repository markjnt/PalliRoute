import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Weekday } from '../../types/models';
import { routesApi } from '../api/routes';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';

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
  area?: string;
  weekend_only?: boolean;
  calendar_week?: number;
}) => {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  
  // Automatisch selectedCalendarWeek verwenden, außer es wird explizit überschrieben
  const finalParams = {
    ...params,
    calendar_week: params?.calendar_week !== undefined ? params.calendar_week : selectedCalendarWeek || undefined
  };
  
  return useQuery({
    queryKey: routeKeys.list(finalParams),
    queryFn: () => routesApi.getRoutes(finalParams),
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
  const { selectedCalendarWeek } = useCalendarWeekStore();
  
  return useMutation({
    mutationFn: ({ weekday, employeeId, calendarWeek }: { weekday: string; employeeId: number; calendarWeek?: number }) => 
      routesApi.optimizeRoutes(weekday, employeeId, calendarWeek || selectedCalendarWeek || undefined),
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

// Hook to optimize weekend routes for a specific day and area
export const useOptimizeWeekendRoutes = () => {
  const queryClient = useQueryClient();
  const { selectedCalendarWeek } = useCalendarWeekStore();
  
  return useMutation({
    mutationFn: ({ weekday, area, calendarWeek }: { weekday: string; area: string; calendarWeek?: number }) => 
      routesApi.optimizeWeekendRoutes(weekday, area, calendarWeek || selectedCalendarWeek || undefined),
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

// Hook to reorder an appointment up or down in a route
export const useReorderAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      routeId, 
      appointmentId, 
      direction 
    }: { 
      routeId: number; 
      appointmentId: number; 
      direction: 'up' | 'down' 
    }) => routesApi.reorderAppointment(routeId, appointmentId, direction),
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