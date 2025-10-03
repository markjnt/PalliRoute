import { useQuery } from '@tanstack/react-query';
import { calendarWeekService } from '../api/calendarWeek';

// Keys für React Query Cache
export const calendarWeekKeys = {
  all: ['calendarWeek'] as const,
  best: () => [...calendarWeekKeys.all, 'best'] as const,
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
