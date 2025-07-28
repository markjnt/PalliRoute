import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RouteVisibilityState {
  showOnlyOwnRoute: boolean;
  toggleRouteVisibility: () => void;
  setShowOnlyOwnRoute: (showOnly: boolean) => void;
}

export const useRouteVisibilityStore = create<RouteVisibilityState>()(
  persist(
    (set) => ({
      showOnlyOwnRoute: true, // Default: nur eigene Route anzeigen
      toggleRouteVisibility: () => set((state) => ({ showOnlyOwnRoute: !state.showOnlyOwnRoute })),
      setShowOnlyOwnRoute: (showOnly: boolean) => set({ showOnlyOwnRoute: showOnly }),
    }),
    {
      name: 'pwa-route-visibility-storage',
    }
  )
); 