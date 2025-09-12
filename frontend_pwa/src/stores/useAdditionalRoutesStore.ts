import { create } from 'zustand';

interface AdditionalRoutesStore {
  selectedEmployeeIds: (number | string)[];
  toggleEmployee: (employeeId: number | string) => void;
  selectAll: (employeeIds: (number | string)[]) => void;
  deselectAll: () => void;
  clearAll: () => void;
  resetForNewUser: () => void;
}

export const useAdditionalRoutesStore = create<AdditionalRoutesStore>((set) => ({
  selectedEmployeeIds: [],
  
  toggleEmployee: (employeeId: number | string) => {
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

  selectAll: (employeeIds: (number | string)[]) => {
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
