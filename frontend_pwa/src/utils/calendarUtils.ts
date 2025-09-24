
/**
 * Utility functions for calendar week calculations
 */

/**
 * Get current calendar week using ISO 8601 standard
 * @returns Current calendar week number
 */
export const getCurrentCalendarWeek = (): number => {
    const now = new Date();
    
    // ISO 8601 week calculation - correct implementation
    const date = new Date(now.getTime());
    
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    const dayOfWeek = (date.getDay() + 6) % 7 + 1; // Monday = 1, Sunday = 7
    date.setDate(date.getDate() + 4 - dayOfWeek);
    
    // Get first day of year
    const yearStart = new Date(date.getFullYear(), 0, 1);
    
    // Calculate full weeks to nearest Thursday
    const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    
    return weekNumber;
};

/**
 * Get the best calendar week to use (current week if available, otherwise latest available)
 * @param availableWeeks Array of available calendar weeks from backend
 * @returns Best calendar week to use
 */
export const getBestCalendarWeek = (availableWeeks: number[]): number => {
    if (availableWeeks.length === 0) {
        throw new Error('No calendar weeks available');
    }
    
    const currentWeek = getCurrentCalendarWeek();
    
    // Use current week if available, otherwise use the latest available week
    return availableWeeks.includes(currentWeek) 
        ? currentWeek 
        : Math.max(...availableWeeks);
};
