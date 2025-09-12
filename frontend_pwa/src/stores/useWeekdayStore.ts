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
        const today = new Date().getDay(); // 0 = Sonntag, 1 = Montag, etc.
        const currentDay = days[today] || 'monday'; // Fallback auf Montag
        set({ selectedWeekday: currentDay });
      }
    }),
    {
      name: 'pwa-weekday-storage', // Name des localStorage-Eintrags
    }
  )
); 