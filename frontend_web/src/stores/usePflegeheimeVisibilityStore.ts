import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PflegeheimeVisibilityState {
  showPflegeheimeOnMap: boolean;
  setShowPflegeheimeOnMap: (show: boolean) => void;
  toggleShowPflegeheimeOnMap: () => void;
}

export const usePflegeheimeVisibilityStore = create<PflegeheimeVisibilityState>()(
  persist(
    (set) => ({
      showPflegeheimeOnMap: false,
      setShowPflegeheimeOnMap: (show) => set({ showPflegeheimeOnMap: show }),
      toggleShowPflegeheimeOnMap: () => set((s) => ({ showPflegeheimeOnMap: !s.showPflegeheimeOnMap })),
    }),
    {
      name: 'pflegeheime-visibility-storage',
      partialize: (state) => ({ showPflegeheimeOnMap: state.showPflegeheimeOnMap }),
    }
  )
);
