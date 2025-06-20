import { create } from 'zustand';

interface NotificationState {
    notification: {
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    };
    loading: {
        active: boolean;
        message: string;
    };
    setNotification: (message: string, severity: 'success' | 'error') => void;
    closeNotification: () => void;
    setLoading: (message: string) => void;
    resetLoading: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notification: {
        open: false,
        message: '',
        severity: 'success'
    },
    loading: {
        active: false,
        message: '',
    },
    setNotification: (message, severity) => set({
        notification: {
            open: true,
            message,
            severity
        }
    }),
    closeNotification: () => set((state) => ({
        notification: {
            ...state.notification,
            open: false
        }
    })),
    setLoading: (message) => set({ loading: { active: true, message } }),
    resetLoading: () => set({ loading: { active: false, message: '' } })
})); 