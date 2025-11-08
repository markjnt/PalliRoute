import { create } from 'zustand';

interface CalendarWeekState {
  selectedCalendarWeek: number | null;
  availableCalendarWeeks: number[];
  setSelectedCalendarWeek: (week: number) => void;
  setAvailableCalendarWeeks: (weeks: number[]) => void;
  clearSelectedCalendarWeek: () => void;
}

export const useCalendarWeekStore = create<CalendarWeekState>()((set) => ({
  selectedCalendarWeek: null,
  availableCalendarWeeks: [],
  setSelectedCalendarWeek: (week: number) => set({ selectedCalendarWeek: week }),
  setAvailableCalendarWeeks: (weeks: number[]) => set({ availableCalendarWeeks: weeks }),
  clearSelectedCalendarWeek: () =>
    set({
      selectedCalendarWeek: null,
      availableCalendarWeeks: [],
    }),
}));
