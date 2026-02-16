import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastUpdateState {
  lastPatientImportTime: Date | null;
  lastEmployeeImportTime: Date | null;
  lastPflegeheimeImportTime: Date | null;
  setLastPatientImportTime: (time: Date) => void;
  setLastEmployeeImportTime: (time: Date) => void;
  setLastPflegeheimeImportTime: (time: Date) => void;
  clearLastPatientImportTime: () => void;
  clearLastEmployeeImportTime: () => void;
  clearLastPflegeheimeImportTime: () => void;
}

export const useLastUpdateStore = create<LastUpdateState>()(
  persist(
    (set) => ({
      lastPatientImportTime: null,
      lastEmployeeImportTime: null,
      lastPflegeheimeImportTime: null,
      setLastPatientImportTime: (time: Date) => set({ lastPatientImportTime: time }),
      setLastEmployeeImportTime: (time: Date) => set({ lastEmployeeImportTime: time }),
      setLastPflegeheimeImportTime: (time: Date) => set({ lastPflegeheimeImportTime: time }),
      clearLastPatientImportTime: () => set({ lastPatientImportTime: null }),
      clearLastEmployeeImportTime: () => set({ lastEmployeeImportTime: null }),
      clearLastPflegeheimeImportTime: () => set({ lastPflegeheimeImportTime: null }),
    }),
    {
      name: 'last-update-storage',
      partialize: (state) => ({
        lastPatientImportTime: state.lastPatientImportTime,
        lastEmployeeImportTime: state.lastEmployeeImportTime,
        lastPflegeheimeImportTime: state.lastPflegeheimeImportTime,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.lastPatientImportTime && typeof state.lastPatientImportTime === 'string') {
          state.lastPatientImportTime = new Date(state.lastPatientImportTime);
        }
        if (state?.lastEmployeeImportTime && typeof state.lastEmployeeImportTime === 'string') {
          state.lastEmployeeImportTime = new Date(state.lastEmployeeImportTime);
        }
        if (state?.lastPflegeheimeImportTime && typeof state.lastPflegeheimeImportTime === 'string') {
          state.lastPflegeheimeImportTime = new Date(state.lastPflegeheimeImportTime);
        }
      },
    }
  )
); 