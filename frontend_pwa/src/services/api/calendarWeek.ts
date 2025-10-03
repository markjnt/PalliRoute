import { patientsApi } from './patients';
import { getBestCalendarWeek } from '../../utils/calendarUtils';

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
        try {
            // Fetch available weeks from backend
            const availableWeeks = await patientsApi.getCalendarWeeks();
            
            // If no weeks available from backend, use current week as fallback
            if (availableWeeks.length === 0) {
                console.warn('No calendar weeks available from backend, using current week as fallback');
                const { getCurrentCalendarWeek } = await import('../../utils/calendarUtils');
                return getCurrentCalendarWeek();
            }
            
            return getBestCalendarWeek(availableWeeks);
        } catch (error) {
            console.error('Failed to get best calendar week:', error);
            
            // If no cache available, use current week as final fallback
            console.warn('No cached week available, using current week as fallback');
            const { getCurrentCalendarWeek } = await import('../../utils/calendarUtils');
            return getCurrentCalendarWeek();
        }
    }
}

// Export singleton instance
export const calendarWeekService = new CalendarWeekService();
