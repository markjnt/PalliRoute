import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  selectedUserId: number | null;
  selectedTourArea: string | null;
  setSelectedUser: (userId: number | null) => void;
  setSelectedTourArea: (area: string | null) => void;
  clearSelectedUser: () => void;
  clearSelectedTourArea: () => void;
  clearAllSelections: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      selectedUserId: null,
      selectedTourArea: null,
      setSelectedUser: (userId: number | null) => set({ selectedUserId: userId }),
      setSelectedTourArea: (area: string | null) => set({ selectedTourArea: area }),
      clearSelectedUser: () => set({ selectedUserId: null }),
      clearSelectedTourArea: () => set({ selectedTourArea: null }),
      clearAllSelections: () => set({ selectedUserId: null, selectedTourArea: null }),
    }),
    {
      name: 'user-storage-v2',
    }
  )
);
