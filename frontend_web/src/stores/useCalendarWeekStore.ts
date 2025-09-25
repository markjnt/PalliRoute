import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalendarWeekStore {
    selectedCalendarWeek: number | null;
    availableCalendarWeeks: number[];
    setSelectedCalendarWeek: (week: number) => void;
    setAvailableCalendarWeeks: (weeks: number[]) => void;
    getCurrentCalendarWeek: () => number;
    clearSelection: () => void;
}

export const useCalendarWeekStore = create<CalendarWeekStore>()(
    persist(
        (set, get) => ({
            selectedCalendarWeek: null,
            availableCalendarWeeks: [],
            
            setSelectedCalendarWeek: (week: number) => {
                const currentState = get();
                // Nur setzen, wenn die Woche in den verfügbaren Wochen enthalten ist
                if (currentState.availableCalendarWeeks.includes(week)) {
                    set({ selectedCalendarWeek: week });
                } else {
                    console.warn(`Calendar week ${week} is not available. Available weeks: ${currentState.availableCalendarWeeks.join(', ')}`);
                }
            },
            
            setAvailableCalendarWeeks: (weeks: number[]) => {
                set({ availableCalendarWeeks: weeks });
                
                const currentState = get();
                
                // Prüfen, ob die aktuell ausgewählte Woche noch verfügbar ist
                if (currentState.selectedCalendarWeek !== null && !weeks.includes(currentState.selectedCalendarWeek)) {
                    // Aktuell ausgewählte Woche ist nicht mehr verfügbar, wähle eine neue aus
                    const currentWeek = currentState.getCurrentCalendarWeek();
                    const weekToSelect = weeks.includes(currentWeek) ? currentWeek : weeks[0];
                    set({ selectedCalendarWeek: weekToSelect });
                    console.warn(`Selected calendar week ${currentState.selectedCalendarWeek} is no longer available. Switched to week ${weekToSelect}`);
                } else if (currentState.selectedCalendarWeek === null && weeks.length > 0) {
                    // Wenn noch keine Woche ausgewählt ist, wähle die aktuelle Woche aus
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
            
            clearSelection: () => {
                set({ 
                    selectedCalendarWeek: null,
                    availableCalendarWeeks: []
                });
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
