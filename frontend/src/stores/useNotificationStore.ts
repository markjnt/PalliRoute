import { create } from 'zustand';

interface NotificationState {
    notification: {
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    };
    setNotification: (message: string, severity: 'success' | 'error') => void;
    closeNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notification: {
        open: false,
        message: '',
        severity: 'success'
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
    }))
})); 