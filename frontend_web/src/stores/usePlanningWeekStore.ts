import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlanningWeekStore {
    selectedPlanningWeek: number | null;
    setSelectedPlanningWeek: (week: number) => void;
    getCurrentPlanningWeek: () => number;
    getAvailablePlanningWeeks: () => number[];
    clearSelection: () => void;
}

export const usePlanningWeekStore = create<PlanningWeekStore>()(
    persist(
        (set, get) => ({
            selectedPlanningWeek: null,
            
            setSelectedPlanningWeek: (week: number) => {
                // Alle Wochen 1-52 sind verfügbar
                if (week >= 1 && week <= 52) {
                    set({ selectedPlanningWeek: week });
                } else {
                    console.warn(`Planning week ${week} is not valid. Must be between 1 and 52.`);
                }
            },
            
            getCurrentPlanningWeek: () => {
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
            
            getAvailablePlanningWeeks: () => {
                // Alle Wochen 1-52 sind verfügbar
                return Array.from({ length: 52 }, (_, i) => i + 1);
            },
            
            clearSelection: () => {
                set({ selectedPlanningWeek: null });
            },
        }),
        {
            name: 'planning-week-store',
            partialize: (state) => ({
                selectedPlanningWeek: state.selectedPlanningWeek,
            }),
        }
    )
);
