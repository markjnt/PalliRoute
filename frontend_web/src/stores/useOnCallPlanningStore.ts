import { create } from 'zustand';

export type ViewMode = 'month' | 'week';
export type DisplayType = 'calendar' | 'table';

interface OnCallPlanningStore {
    viewMode: ViewMode;
    displayType: DisplayType;  // 'calendar' or 'table'
    currentDate: Date;  // Current month/week being viewed
    setViewMode: (mode: ViewMode) => void;
    setDisplayType: (type: DisplayType) => void;
    setCurrentDate: (date: Date) => void;
    goToPrevious: () => void;
    goToNext: () => void;
    goToToday: () => void;
}

export const useOnCallPlanningStore = create<OnCallPlanningStore>()((set, get) => ({
    viewMode: 'month',
    displayType: 'calendar',
    currentDate: new Date(),
    
    setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
    },
    
    setDisplayType: (type: DisplayType) => {
        set({ displayType: type });
    },
    
    setCurrentDate: (date: Date) => {
        set({ currentDate: date });
    },
    
    goToPrevious: () => {
        const { currentDate, viewMode } = get();
        const newDate = new Date(currentDate);
        
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            // Week view: go back 7 days
            newDate.setDate(newDate.getDate() - 7);
        }
        
        set({ currentDate: newDate });
    },
    
    goToNext: () => {
        const { currentDate, viewMode } = get();
        const newDate = new Date(currentDate);
        
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            // Week view: go forward 7 days
            newDate.setDate(newDate.getDate() + 7);
        }
        
        set({ currentDate: newDate });
    },
    
    goToToday: () => {
        set({ currentDate: new Date() });
    },
}));

