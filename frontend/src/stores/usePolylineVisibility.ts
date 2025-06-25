import { create } from 'zustand';

// Zustandsspeicher für die Sichtbarkeit von Polylines (Blacklist-Prinzip)
export type PolylineVisibilityStore = {
  hiddenIds: Set<number>;
  toggleVisibility: (id: number) => void;
  hideAll: (ids: number[]) => void;
  showAll: (ids: number[]) => void;
  // isVisible entfernt
};

export const usePolylineVisibility = create<PolylineVisibilityStore>((set, get) => ({
  hiddenIds: new Set<number>(),

  toggleVisibility: (id: number) => {
    const newSet = new Set(get().hiddenIds);
    if (newSet.has(id)) {
      newSet.delete(id); // wieder einblenden
    } else {
      newSet.add(id); // ausblenden
    }
    set({ hiddenIds: newSet });
  },
  hideAll: (ids: number[]) => {
    set({ hiddenIds: new Set(ids) });
  },
  showAll: (ids: number[]) => {
    set({ hiddenIds: new Set() });
  }
})); 