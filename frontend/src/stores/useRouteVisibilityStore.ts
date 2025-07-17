import { create } from 'zustand';

// Zustandsspeicher für die Sichtbarkeit von Polylines und Markern (Blacklist-Prinzip)
export type RouteVisibilityStore = {
  hiddenPolylines: Set<number>;
  hiddenMarkers: Set<number>;
  // Polyline-Methoden
  togglePolyline: (id: number) => void;
  hidePolyline: (id: number) => void;
  showPolyline: (id: number) => void;
  hideAllPolylines: (ids: number[]) => void;
  showAllPolylines: () => void;
  // Marker-Methoden
  toggleMarker: (id: number) => void;
  hideMarker: (id: number) => void;
  showMarker: (id: number) => void;
  showAllMarkers: () => void;
};

export const useRouteVisibility = create<RouteVisibilityStore>((set, get) => ({
  hiddenPolylines: new Set<number>(),
  hiddenMarkers: new Set<number>(),

  // Polyline-Methoden
  togglePolyline: (id: number) => {
    const newSet = new Set(get().hiddenPolylines);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    set({ hiddenPolylines: newSet });
  },
  hidePolyline: (id: number) => {
    const newSet = new Set(get().hiddenPolylines);
    newSet.add(id);
    set({ hiddenPolylines: newSet });
  },
  showPolyline: (id: number) => {
    const newSet = new Set(get().hiddenPolylines);
    newSet.delete(id);
    set({ hiddenPolylines: newSet });
  },
  hideAllPolylines: (ids: number[]) => {
    set({ hiddenPolylines: new Set(ids) });
  },
  showAllPolylines: () => {
    set({ hiddenPolylines: new Set() });
  },

  // Marker-Methoden
  toggleMarker: (id: number) => {
    const newSet = new Set(get().hiddenMarkers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    set({ hiddenMarkers: newSet });
  },
  hideMarker: (id: number) => {
    const newSet = new Set(get().hiddenMarkers);
    newSet.add(id);
    set({ hiddenMarkers: newSet });
  },
  showMarker: (id: number) => {
    const newSet = new Set(get().hiddenMarkers);
    newSet.delete(id);
    set({ hiddenMarkers: newSet });
  },
  showAllMarkers: () => {
    set({ hiddenMarkers: new Set() });
  },
})); 