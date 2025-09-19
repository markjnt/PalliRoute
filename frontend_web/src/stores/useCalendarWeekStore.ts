import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalendarWeekStore {
    selectedCalendarWeek: number | null;
    availableCalendarWeeks: number[];
    setSelectedCalendarWeek: (week: number) => void;
    setAvailableCalendarWeeks: (weeks: number[]) => void;
    getCurrentCalendarWeek: () => number;
}

export const useCalendarWeekStore = create<CalendarWeekStore>()(
    persist(
        (set, get) => ({
            selectedCalendarWeek: null,
            availableCalendarWeeks: [],
            
            setSelectedCalendarWeek: (week: number) => {
                set({ selectedCalendarWeek: week });
            },
            
            setAvailableCalendarWeeks: (weeks: number[]) => {
                set({ availableCalendarWeeks: weeks });
                
                // Wenn noch keine Woche ausgewählt ist, wähle die aktuelle Woche aus
                const currentState = get();
                if (currentState.selectedCalendarWeek === null && weeks.length > 0) {
                    const currentWeek = currentState.getCurrentCalendarWeek();
                    const weekToSelect = weeks.includes(currentWeek) ? currentWeek : weeks[0];
                    set({ selectedCalendarWeek: weekToSelect });
                }
            },
            
            getCurrentCalendarWeek: () => {
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
            },
        }),
        {
            name: 'calendar-week-store',
            partialize: (state) => ({
                selectedCalendarWeek: state.selectedCalendarWeek,
            }),
        }
    )
);
