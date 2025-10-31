import { create } from 'zustand';

interface CalendarWeekState {
  selectedCalendarWeek: number | null;
  setSelectedCalendarWeek: (week: number) => void;
  clearSelectedCalendarWeek: () => void;
}

export const useCalendarWeekStore = create<CalendarWeekState>()((set) => ({
  selectedCalendarWeek: null,
  setSelectedCalendarWeek: (week: number) => set({ selectedCalendarWeek: week }),
  clearSelectedCalendarWeek: () => set({ selectedCalendarWeek: null }),
}));
