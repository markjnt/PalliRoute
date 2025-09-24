import { patientsApi } from './patients';
import { getBestCalendarWeek } from '../../utils/calendarUtils';

/**
 * Service to manage calendar week selection across all APIs
 * This ensures we only fetch available weeks once and reuse the result
 */
class CalendarWeekService {
    private cachedWeek: number | null = null;
    private cacheTimestamp: number | null = null;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Get the best calendar week to use (current or latest available)
     * Uses caching to avoid multiple API calls
     */
    async getBestWeek(): Promise<number> {
        const now = Date.now();
        
        // Return cached value if still valid
        if (this.cachedWeek && this.cacheTimestamp && 
            (now - this.cacheTimestamp) < this.CACHE_DURATION) {
            return this.cachedWeek;
        }

        try {
            // Fetch available weeks from backend
            const availableWeeks = await patientsApi.getCalendarWeeks();
            const bestWeek = getBestCalendarWeek(availableWeeks);
            
            // Cache the result
            this.cachedWeek = bestWeek;
            this.cacheTimestamp = now;
            
            return bestWeek;
        } catch (error) {
            console.error('Failed to get best calendar week:', error);
            throw error;
        }
    }

    /**
     * Clear the cache (useful after data imports)
     */
    clearCache(): void {
        this.cachedWeek = null;
        this.cacheTimestamp = null;
    }
}

// Export singleton instance
export const calendarWeekService = new CalendarWeekService();
