import { create } from 'zustand';

interface MapResetState {
  shouldResetMap: boolean;
  resetMap: () => void;
  clearResetFlag: () => void;
}

export const useMapResetStore = create<MapResetState>((set) => ({
  shouldResetMap: false,
  resetMap: () => set({ shouldResetMap: true }),
  clearResetFlag: () => set({ shouldResetMap: false })
})); 