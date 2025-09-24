import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalendarWeekState {
  selectedCalendarWeek: number | null;
  setSelectedCalendarWeek: (week: number) => void;
  clearSelectedCalendarWeek: () => void;
}

export const useCalendarWeekStore = create<CalendarWeekState>()(
  persist(
    (set) => ({
      selectedCalendarWeek: null,
      setSelectedCalendarWeek: (week: number) => set({ selectedCalendarWeek: week }),
      clearSelectedCalendarWeek: () => set({ selectedCalendarWeek: null }),
    }),
    {
      name: 'pwa-calendar-week-storage',
    }
  )
);
