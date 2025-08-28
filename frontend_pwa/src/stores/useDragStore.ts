import { create } from 'zustand';

interface DragStore {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
}

export const useDragStore = create<DragStore>((set) => ({
  isDragging: false,
  setIsDragging: (isDragging: boolean) => set({ isDragging }),
}));
