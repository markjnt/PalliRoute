import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  selectedUserId: number | null;
  setSelectedUser: (userId: number | null) => void;
  clearSelectedUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      selectedUserId: null,
      setSelectedUser: (userId: number | null) => set({ selectedUserId: userId }),
      clearSelectedUser: () => set({ selectedUserId: null }),
    }),
    {
      name: 'user-storage',
    }
  )
); 