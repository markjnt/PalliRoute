import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Constants
const LEFT_SIDEBAR_WIDTH = '40%';
const RIGHT_SIDEBAR_WIDTH = '50%';

interface SidebarState {
  isFullscreen: boolean;
  isCollapsed: boolean;
}

interface LayoutState {
  // State
  leftSidebar: SidebarState;
  rightSidebar: SidebarState;
  
  // Actions
  setLeftSidebarFullscreen: (isFullscreen: boolean) => void;
  setRightSidebarFullscreen: (isFullscreen: boolean) => void;
  setLeftSidebarCollapsed: (isCollapsed: boolean) => void;
  setRightSidebarCollapsed: (isCollapsed: boolean) => void;
  resetLayout: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Initial State
      leftSidebar: {
        isFullscreen: false,
        isCollapsed: false,
      },
      rightSidebar: {
        isFullscreen: false,
        isCollapsed: false,
      },
      
      // Actions
      setLeftSidebarFullscreen: (isFullscreen) => 
        set((state) => ({
          leftSidebar: { 
            ...state.leftSidebar, 
            isFullscreen,
            isCollapsed: isFullscreen ? false : state.leftSidebar.isCollapsed 
          },
          rightSidebar: isFullscreen 
            ? { ...state.rightSidebar, isFullscreen: false }
            : state.rightSidebar
        })),
      
      setRightSidebarFullscreen: (isFullscreen) => 
        set((state) => ({
          rightSidebar: { 
            ...state.rightSidebar, 
            isFullscreen,
            isCollapsed: isFullscreen ? false : state.rightSidebar.isCollapsed 
          },
          leftSidebar: isFullscreen 
            ? { ...state.leftSidebar, isFullscreen: false }
            : state.leftSidebar
        })),
      
      setLeftSidebarCollapsed: (isCollapsed) => 
        set((state) => ({
          leftSidebar: { 
            ...state.leftSidebar, 
            isCollapsed,
            isFullscreen: isCollapsed ? false : state.leftSidebar.isFullscreen 
          }
        })),
      
      setRightSidebarCollapsed: (isCollapsed) => 
        set((state) => ({
          rightSidebar: { 
            ...state.rightSidebar, 
            isCollapsed,
            isFullscreen: isCollapsed ? false : state.rightSidebar.isFullscreen 
          }
        })),
      
      resetLayout: () => 
        set({
          leftSidebar: {
            isFullscreen: false,
            isCollapsed: false,
          },
          rightSidebar: {
            isFullscreen: false,
            isCollapsed: false,
          }
        })
    }),
    {
      name: 'layout-storage',
    }
  )
); 