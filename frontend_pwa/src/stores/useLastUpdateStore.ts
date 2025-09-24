import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastUpdateState {
  lastUpdateTime: Date | null;
  setLastUpdateTime: (time: Date) => void;
  clearLastUpdateTime: () => void;
}

export const useLastUpdateStore = create<LastUpdateState>()(
  persist(
    (set) => ({
      lastUpdateTime: null,
      setLastUpdateTime: (time: Date) => set({ lastUpdateTime: time }),
      clearLastUpdateTime: () => set({ lastUpdateTime: null }),
    }),
    {
      name: 'last-update-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.lastUpdateTime && typeof state.lastUpdateTime === 'string') {
          state.lastUpdateTime = new Date(state.lastUpdateTime);
        }
      },
    }
  )
);
