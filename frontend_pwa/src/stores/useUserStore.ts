import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  selectedUserId: number | null;
  selectedWeekendArea: string | null;
  setSelectedUser: (userId: number | null) => void;
  setSelectedWeekendArea: (area: string | null) => void;
  clearSelectedUser: () => void;
  clearSelectedWeekendArea: () => void;
  clearAllSelections: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      selectedUserId: null,
      selectedWeekendArea: null,
      setSelectedUser: (userId: number | null) => set({ selectedUserId: userId }),
      setSelectedWeekendArea: (area: string | null) => set({ selectedWeekendArea: area }),
      clearSelectedUser: () => set({ selectedUserId: null }),
      clearSelectedWeekendArea: () => set({ selectedWeekendArea: null }),
      clearAllSelections: () => set({ selectedUserId: null, selectedWeekendArea: null }),
    }),
    {
      name: 'user-storage',
    }
  )
); 