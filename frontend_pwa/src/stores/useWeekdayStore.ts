import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Typ für gültige Wochentage
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface WeekdayState {
  // State
  selectedWeekday: Weekday;
  
  // Actions
  setSelectedWeekday: (day: Weekday) => void;
  resetToCurrentDay: () => void;
}

export const useWeekdayStore = create<WeekdayState>()(
  persist(
    (set) => ({
      // State
      selectedWeekday: 'monday', // Default-Wert
      
      // Actions
      setSelectedWeekday: (day) => set({ selectedWeekday: day }),
      resetToCurrentDay: () => {
        const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = days[new Date().getDay()];
        const isBusinessDay = currentDay === 'monday' || currentDay === 'tuesday' || currentDay === 'wednesday' || currentDay === 'thursday' || currentDay === 'friday';
        set({ selectedWeekday: isBusinessDay && currentDay ? currentDay : 'monday' });
      }
    }),
    {
      name: 'pwa-weekday-storage', // Name des localStorage-Eintrags
    }
  )
); 