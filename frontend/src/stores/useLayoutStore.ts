import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Constants
const DEFAULT_SIDEBAR_WIDTH = 425;

interface SidebarState {
  isFullscreen: boolean;
  width: number;
  isCollapsed: boolean;
}

interface LayoutState {
  // State
  leftSidebar: SidebarState;
  rightSidebar: SidebarState;
  
  // Actions
  setLeftSidebarFullscreen: (isFullscreen: boolean) => void;
  setRightSidebarFullscreen: (isFullscreen: boolean) => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
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
        width: DEFAULT_SIDEBAR_WIDTH,
        isCollapsed: false,
      },
      rightSidebar: {
        isFullscreen: false,
        width: DEFAULT_SIDEBAR_WIDTH,
        isCollapsed: false,
      },
      
      // Actions
      setLeftSidebarFullscreen: (isFullscreen) => 
        set((state) => ({
          leftSidebar: { 
            ...state.leftSidebar, 
            isFullscreen,
            // If setting to fullscreen, ensure sidebar is not collapsed
            isCollapsed: isFullscreen ? false : state.leftSidebar.isCollapsed 
          },
          // If setting left sidebar to fullscreen, ensure right is not fullscreen
          rightSidebar: isFullscreen 
            ? { ...state.rightSidebar, isFullscreen: false }
            : state.rightSidebar
        })),
      
      setRightSidebarFullscreen: (isFullscreen) => 
        set((state) => ({
          rightSidebar: { 
            ...state.rightSidebar, 
            isFullscreen,
            // If setting to fullscreen, ensure sidebar is not collapsed
            isCollapsed: isFullscreen ? false : state.rightSidebar.isCollapsed 
          },
          // If setting right sidebar to fullscreen, ensure left is not fullscreen
          leftSidebar: isFullscreen 
            ? { ...state.leftSidebar, isFullscreen: false }
            : state.leftSidebar
        })),
      
      setLeftSidebarWidth: (width) => 
        set((state) => ({
          leftSidebar: { ...state.leftSidebar, width }
        })),
      
      setRightSidebarWidth: (width) => 
        set((state) => ({
          rightSidebar: { ...state.rightSidebar, width }
        })),
      
      setLeftSidebarCollapsed: (isCollapsed) => 
        set((state) => ({
          leftSidebar: { 
            ...state.leftSidebar, 
            isCollapsed,
            // If uncollapsing, ensure it's not in fullscreen
            isFullscreen: isCollapsed ? false : state.leftSidebar.isFullscreen 
          }
        })),
      
      setRightSidebarCollapsed: (isCollapsed) => 
        set((state) => ({
          rightSidebar: { 
            ...state.rightSidebar, 
            isCollapsed,
            // If uncollapsing, ensure it's not in fullscreen
            isFullscreen: isCollapsed ? false : state.rightSidebar.isFullscreen 
          }
        })),
      
      resetLayout: () => 
        set({
          leftSidebar: {
            isFullscreen: false,
            width: DEFAULT_SIDEBAR_WIDTH,
            isCollapsed: false,
          },
          rightSidebar: {
            isFullscreen: false,
            width: DEFAULT_SIDEBAR_WIDTH,
            isCollapsed: false,
          }
        })
    }),
    {
      name: 'layout-storage', // Name for localStorage entry
    }
  )
); 