import { useQueryClient } from '@tanstack/react-query';
import { patientKeys } from './usePatients';
import { appointmentKeys } from './useAppointments';
import { routeKeys } from './useRoutes';
import { calendarWeekKeys } from './useCalendarWeek';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';

/**
 * Central hook for refreshing data
 * Provides a function to invalidate all queries except employees
 * (employees are automatically refreshed)
 */
export const useRefresh = () => {
  const queryClient = useQueryClient();
  const { setLastUpdateTime } = useLastUpdateStore();

  const refreshData = () => {
    // Invalidate all queries except employees (they auto-refresh)
    queryClient.invalidateQueries({ queryKey: patientKeys.all });
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    queryClient.invalidateQueries({ queryKey: routeKeys.all });
    queryClient.invalidateQueries({ queryKey: calendarWeekKeys.all });
    
    // Update last update time
    setLastUpdateTime(new Date());
  };

  return {
    refreshData,
  };
};
