import { useQuery } from '@tanstack/react-query';
import { calendarWeekService } from '../api/calendarWeek';
import { patientsApi } from '../api/patients';

// Keys für React Query Cache
export const calendarWeekKeys = {
  all: ['calendarWeek'] as const,
  best: () => [...calendarWeekKeys.all, 'best'] as const,
  list: () => [...calendarWeekKeys.all, 'list'] as const,
};

// Hook zum Laden der besten Kalenderwoche
export const useCalendarWeek = () => {
  return useQuery({
    queryKey: calendarWeekKeys.best(),
    queryFn: () => calendarWeekService.getBestWeek(),
    staleTime: 5 * 60 * 1000, // 5 minutes - same as cache duration
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
  });
};

// Hook zum Laden aller verfügbaren Kalenderwochen
export const useCalendarWeeks = () => {
  return useQuery({
    queryKey: calendarWeekKeys.list(),
    queryFn: () => patientsApi.getCalendarWeeks(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
