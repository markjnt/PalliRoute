import { create } from 'zustand';

interface AdditionalRoutesStore {
  selectedEmployeeIds: number[];
  toggleEmployee: (employeeId: number) => void;
  selectAll: (employeeIds: number[]) => void;
  deselectAll: () => void;
  clearAll: () => void;
  resetForNewUser: () => void;
}

export const useAdditionalRoutesStore = create<AdditionalRoutesStore>((set) => ({
  selectedEmployeeIds: [],
  
  toggleEmployee: (employeeId: number) => {
    set((state) => {
      const isSelected = state.selectedEmployeeIds.includes(employeeId);
      if (isSelected) {
        return {
          selectedEmployeeIds: state.selectedEmployeeIds.filter(id => id !== employeeId)
        };
      } else {
        return {
          selectedEmployeeIds: [...state.selectedEmployeeIds, employeeId]
        };
      }
    });
  },

  selectAll: (employeeIds: number[]) => {
    set({ selectedEmployeeIds: [...employeeIds] });
  },

  deselectAll: () => {
    set({ selectedEmployeeIds: [] });
  },
  
  clearAll: () => {
    set({ selectedEmployeeIds: [] });
  },

  resetForNewUser: () => {
    set({ selectedEmployeeIds: [] });
  },
}));
