import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Typ für gültige Wochentage
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

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
        const days: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const today = new Date().getDay() - 1; // 0 = Montag in unserem System (getDay() gibt 1 für Montag)
        const currentDay = today >= 0 && today < 5 ? days[today] : 'monday'; // Fallback auf Montag für Wochenenden
        set({ selectedWeekday: currentDay });
      }
    }),
    {
      name: 'pwa-weekday-storage', // Name des localStorage-Eintrags
    }
  )
); 