import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';

interface RouteCompletionState {
  currentWeekday: string | null;
  // Map of weekday -> Set of completed appointment IDs
  completedStopsByWeekday: Record<string, Set<number>>;
  setCurrentWeekday: (weekday: string) => void;
  toggleStop: (appointmentId: number) => void;
  setStopCompleted: (appointmentId: number, completed: boolean) => void;
  clearCompletedStops: () => void;
  clearAllCompletedStops: () => void;
  isStopCompleted: (appointmentId: number) => boolean;
}

export const useRouteCompletionStore = create<RouteCompletionState>()(
  persist(
    (set, get) => ({
      currentWeekday: null,
      completedStopsByWeekday: {},
      
      setCurrentWeekday: (weekday: string) => {
        set((state) => {
          // If switching to a different day, keep the completed stops for that day
          // (they are already stored in completedStopsByWeekday)
          return { currentWeekday: weekday };
        });
      },
      
      toggleStop: (appointmentId: number) => {
        const state = get();
        const weekday = state.currentWeekday;
        if (!weekday) return;
        
        set((state) => {
          const newCompletedStopsByWeekday = { ...state.completedStopsByWeekday };
          const currentStops = newCompletedStopsByWeekday[weekday];
          
          // Create new Set only if it doesn't exist or if we need to modify it
          const newStops = currentStops ? new Set(currentStops) : new Set<number>();
          
          if (newStops.has(appointmentId)) {
            newStops.delete(appointmentId);
          } else {
            newStops.add(appointmentId);
          }
          
          newCompletedStopsByWeekday[weekday] = newStops;
          return { completedStopsByWeekday: newCompletedStopsByWeekday };
        });
      },
      
      setStopCompleted: (appointmentId: number, completed: boolean) => {
        const state = get();
        const weekday = state.currentWeekday;
        if (!weekday) return;
        
        set((state) => {
          const newCompletedStopsByWeekday = { ...state.completedStopsByWeekday };
          const currentStops = newCompletedStopsByWeekday[weekday];
          
          // Create new Set only if it doesn't exist or if we need to modify it
          const newStops = currentStops ? new Set(currentStops) : new Set<number>();
          
          if (completed) {
            newStops.add(appointmentId);
          } else {
            newStops.delete(appointmentId);
          }
          
          newCompletedStopsByWeekday[weekday] = newStops;
          return { completedStopsByWeekday: newCompletedStopsByWeekday };
        });
      },
      
      clearCompletedStops: () => {
        const state = get();
        const weekday = state.currentWeekday;
        if (!weekday) return;
        
        set((state) => {
          const newCompletedStopsByWeekday = { ...state.completedStopsByWeekday };
          newCompletedStopsByWeekday[weekday] = new Set<number>();
          return { completedStopsByWeekday: newCompletedStopsByWeekday };
        });
      },
      
      clearAllCompletedStops: () => {
        set({ completedStopsByWeekday: {} });
      },
      
      isStopCompleted: (appointmentId: number) => {
        const state = get();
        if (!state.currentWeekday) return false;
        const stops = state.completedStopsByWeekday[state.currentWeekday];
        return stops ? stops.has(appointmentId) : false;
      },
    }),
    {
      name: 'pwa-route-completion-storage',
      // Convert Sets to Arrays for storage and back
      partialize: (state) => {
        const completedStopsByWeekdayArray: Record<string, number[]> = {};
        for (const [weekday, stops] of Object.entries(state.completedStopsByWeekday)) {
          completedStopsByWeekdayArray[weekday] = Array.from(stops);
        }
        return {
          currentWeekday: state.currentWeekday,
          completedStopsByWeekday: completedStopsByWeekdayArray,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state && state.completedStopsByWeekday) {
          const completedStopsByWeekday: Record<string, Set<number>> = {};
          for (const [weekday, stopsArray] of Object.entries(state.completedStopsByWeekday)) {
            if (Array.isArray(stopsArray)) {
              completedStopsByWeekday[weekday] = new Set(stopsArray);
            }
          }
          state.completedStopsByWeekday = completedStopsByWeekday;
        } else if (state) {
          // Migration: if old format exists, convert it
          if ('completedStopsByWeekAndDay' in state && typeof (state as any).completedStopsByWeekAndDay === 'object') {
            // Migrate from old format (week -> weekday -> Set) to new format (weekday -> Set)
            // Just take the current week's data or clear if no current week
            state.completedStopsByWeekday = {};
          } else if ('completedStopsByWeekday' in state && typeof (state as any).completedStopsByWeekday === 'object') {
            // Already in correct format, just convert Sets
            const oldData = (state as any).completedStopsByWeekday;
            const completedStopsByWeekday: Record<string, Set<number>> = {};
            for (const [weekday, stopsArray] of Object.entries(oldData)) {
              if (Array.isArray(stopsArray)) {
                completedStopsByWeekday[weekday] = new Set(stopsArray);
              }
            }
            state.completedStopsByWeekday = completedStopsByWeekday;
          } else if ('completedStops' in state && Array.isArray((state as any).completedStops)) {
            // Very old format: single completedStops array
            const oldStops = (state as any).completedStops;
            const currentWeekday = state.currentWeekday;
            
            if (currentWeekday) {
              state.completedStopsByWeekday = {
                [currentWeekday]: new Set(oldStops)
              };
            } else {
              state.completedStopsByWeekday = {};
            }
          } else {
            state.completedStopsByWeekday = {};
          }
        }
      },
    }
  )
);

// Empty set cache to avoid creating new sets every time
const EMPTY_SET = new Set<number>();

/**
 * Selector hook to get completedStops for current weekday.
 * Returns the Set directly from the store to maintain reference stability.
 * Re-renders when currentWeekday or the Set reference changes.
 */
export const useCompletedStops = () => {
  return useRouteCompletionStore((state) => {
    if (!state.currentWeekday) {
      return EMPTY_SET;
    }
    
    // Return the Set directly - Zustand uses Object.is() for comparison
    // This ensures we only re-render when the Set reference actually changes
    return state.completedStopsByWeekday[state.currentWeekday] || EMPTY_SET;
  });
}; 