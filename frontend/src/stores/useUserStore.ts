import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/models';

interface UserState {
  // State
  currentUser: User | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // State
      currentUser: null,
      
      // Actions
      setCurrentUser: (user) => set({ currentUser: user }),
      clearUser: () => set({ currentUser: null }),
    }),
    {
      name: 'user-storage', // Name des localStorage-Eintrags
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
); 