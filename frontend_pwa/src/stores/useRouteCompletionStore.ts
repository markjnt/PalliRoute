import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RouteCompletionState {
  completedStops: Set<number>; // Set of completed appointment IDs
  toggleStop: (appointmentId: number) => void;
  setStopCompleted: (appointmentId: number, completed: boolean) => void;
  clearCompletedStops: () => void;
  isStopCompleted: (appointmentId: number) => boolean;
}

export const useRouteCompletionStore = create<RouteCompletionState>()(
  persist(
    (set, get) => ({
      completedStops: new Set(),
      
      toggleStop: (appointmentId: number) => {
        set((state) => {
          const newCompletedStops = new Set(state.completedStops);
          if (newCompletedStops.has(appointmentId)) {
            newCompletedStops.delete(appointmentId);
          } else {
            newCompletedStops.add(appointmentId);
          }
          return { completedStops: newCompletedStops };
        });
      },
      
      setStopCompleted: (appointmentId: number, completed: boolean) => {
        set((state) => {
          const newCompletedStops = new Set(state.completedStops);
          if (completed) {
            newCompletedStops.add(appointmentId);
          } else {
            newCompletedStops.delete(appointmentId);
          }
          return { completedStops: newCompletedStops };
        });
      },
      
      clearCompletedStops: () => {
        set({ completedStops: new Set() });
      },
      
      isStopCompleted: (appointmentId: number) => {
        return get().completedStops.has(appointmentId);
      },
    }),
    {
      name: 'pwa-route-completion-storage',
      // Convert Set to Array for storage and back
      partialize: (state) => ({
        completedStops: Array.from(state.completedStops),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.completedStops)) {
          state.completedStops = new Set(state.completedStops);
        }
      },
    }
  )
); 