import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AreaState {
  currentArea: string | null;
  setCurrentArea: (area: string | null) => void;
  clearArea: () => void;
}

export const useAreaStore = create<AreaState>()(
  persist(
    (set) => ({
      currentArea: null,
      setCurrentArea: (area) => set({ currentArea: area }),
      clearArea: () => set({ currentArea: null }),
    }),
    {
      name: 'area-storage',
      partialize: (state) => ({ currentArea: state.currentArea }),
    }
  )
); 