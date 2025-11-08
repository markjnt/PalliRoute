import { patientsApi } from './patients';
import { getBestCalendarWeek } from '../../utils/calendarUtils';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';

/**
 * Service to manage calendar week selection across all APIs
 * This is now stateless - React Query will handle caching
 */
class CalendarWeekService {
    /**
     * Get the best calendar week to use (current or latest available)
     * No longer caches - React Query handles caching
     */
    async getBestWeek(): Promise<number> {
        const {
            selectedCalendarWeek,
            availableCalendarWeeks,
            setSelectedCalendarWeek,
            setAvailableCalendarWeeks,
        } = useCalendarWeekStore.getState();

        if (selectedCalendarWeek !== null) {
            return selectedCalendarWeek;
        }

        try {
            let weeks = availableCalendarWeeks;

            if (weeks.length === 0) {
                // Fetch available weeks from backend
                weeks = await patientsApi.getCalendarWeeks();
                setAvailableCalendarWeeks(weeks);
            }
            
            // If no weeks available from backend, use current week as fallback
            if (weeks.length === 0) {
                console.warn('No calendar weeks available from backend, using current week as fallback');
                const { getCurrentCalendarWeek } = await import('../../utils/calendarUtils');
                const fallbackWeek = getCurrentCalendarWeek();
                setSelectedCalendarWeek(fallbackWeek);
                return fallbackWeek;
            }

            const bestWeek = getBestCalendarWeek(weeks);
            setSelectedCalendarWeek(bestWeek);
            return bestWeek;
        } catch (error) {
            console.error('Failed to get best calendar week:', error);
            
            // If no cache available, use current week as final fallback
            console.warn('No cached week available, using current week as fallback');
            const { getCurrentCalendarWeek } = await import('../../utils/calendarUtils');
            const fallbackWeek = getCurrentCalendarWeek();
            setSelectedCalendarWeek(fallbackWeek);
            return fallbackWeek;
        }
    }
}

// Export singleton instance
export const calendarWeekService = new CalendarWeekService();
