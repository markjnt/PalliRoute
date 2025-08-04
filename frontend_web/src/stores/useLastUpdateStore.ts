import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastUpdateState {
  lastPatientImportTime: string | null;
  lastEmployeeImportTime: string | null;
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
      setLastPatientImportTime: (time: Date) => set({ lastPatientImportTime: time.toISOString() }),
      setLastEmployeeImportTime: (time: Date) => set({ lastEmployeeImportTime: time.toISOString() }),
      clearLastPatientImportTime: () => set({ lastPatientImportTime: null }),
      clearLastEmployeeImportTime: () => set({ lastEmployeeImportTime: null }),
    }),
    {
      name: 'last-update-storage',
    }
  )
); 