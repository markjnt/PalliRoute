import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomMarkerData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface CustomMarkerState {
  marker: CustomMarkerData | null;
  setMarker: (marker: CustomMarkerData | null) => void;
  clearMarker: () => void;
}

export const useCustomMarkerStore = create<CustomMarkerState>()(
  persist(
    (set) => ({
      marker: null,
      setMarker: (marker) => set({ marker }),
      clearMarker: () => set({ marker: null }),
    }),
    {
      name: 'custom-marker-storage',
      partialize: (state) => ({ marker: state.marker }),
    }
  )
);
