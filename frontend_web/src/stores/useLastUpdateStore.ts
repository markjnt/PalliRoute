import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastUpdateState {
  lastPatientImportTime: Date | null;
  lastEmployeeImportTime: Date | null;
  setLastPatientImportTime: (time: Date) => void;
  setLastEmployeeImportTime: (time: Date) => void;
  clearLastPatientImportTime: () => void;
  clearLastEmployeeImportTime: () => void;
}

export const useLastUpdateStore = create<LastUpdateState>()(
  persist(
    (set) => ({
      lastPatientImportTime: null,
      lastEmployeeImportTime: null,
      setLastPatientImportTime: (time: Date) => set({ lastPatientImportTime: time }),
      setLastEmployeeImportTime: (time: Date) => set({ lastEmployeeImportTime: time }),
      clearLastPatientImportTime: () => set({ lastPatientImportTime: null }),
      clearLastEmployeeImportTime: () => set({ lastEmployeeImportTime: null }),
    }),
    {
      name: 'last-update-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.lastPatientImportTime && typeof state.lastPatientImportTime === 'string') {
          state.lastPatientImportTime = new Date(state.lastPatientImportTime);
        }
        if (state?.lastEmployeeImportTime && typeof state.lastEmployeeImportTime === 'string') {
          state.lastEmployeeImportTime = new Date(state.lastEmployeeImportTime);
        }
      },
    }
  )
); 