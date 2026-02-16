import React, { useEffect, useRef } from 'react';
import { Box, IconButton, Drawer, useTheme, useMediaQuery, Snackbar, Alert, LinearProgress, CircularProgress } from '@mui/material';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { useLayoutStore } from '../../stores';
import { useAreaStore } from '../../stores/useAreaStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from '../employees/EmployeeSidebar';
import { TourPlanSidebar } from '../patients/TourSidebar';

const MIN_MAIN_CONTENT_WIDTH = 100;
const COLLAPSED_WIDTH = 0;
const DEFAULT_SIDEBAR_WIDTH = 425;

export const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const [isRightResizing, setIsRightResizing] = React.useState(false);
    
    // Sidebar refs for resize functionality
    const sidebarRef = React.useRef<HTMLDivElement>(null);
    const rightSidebarRef = React.useRef<HTMLDivElement>(null);
    
    // Weekday store for auto-selecting current day
    const { resetToCurrentDay } = useWeekdayStore();
    const isInitialMountRef = useRef(true);
    
    // Automatisch den aktuellen Tag auswählen beim Laden der Seite
    useEffect(() => {
        if (isInitialMountRef.current) {
            resetToCurrentDay();
            isInitialMountRef.current = false;
        }
    }, [resetToCurrentDay]);
    
    // Resize tracking refs
    const resizeRef = React.useRef<{
        startX: number;
        startWidth: number;
    }>({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH });
    
    const rightResizeRef = React.useRef<{
        startX: number;
        startWidth: number;
    }>({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH });
    
    // Get layout state and actions from store
    const {
        leftSidebar,
        rightSidebar,
        setLeftSidebarFullscreen,
        setRightSidebarFullscreen,
        setLeftSidebarWidth,
        setRightSidebarWidth,
        setLeftSidebarCollapsed,
        setRightSidebarCollapsed
    } = useLayoutStore();
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { currentArea } = useAreaStore();
    const navigate = useNavigate();
    const { notification, closeNotification, loading } = useNotificationStore();

    // Left sidebar resize handlers
    const startResizing = React.useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        resizeRef.current = {
            startX: e.clientX,
            startWidth: leftSidebar.width
        };
    }, [leftSidebar.width]);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                mouseMoveEvent.preventDefault();
                
                // Use requestAnimationFrame for smooth performance
                requestAnimationFrame(() => {
                    const delta = mouseMoveEvent.clientX - resizeRef.current.startX;
                    
                    // Berechne die verfügbare Breite für den Hauptinhalt
                    const availableWidth = window.innerWidth - rightSidebar.width;
                    const maxLeftSidebarWidth = availableWidth - MIN_MAIN_CONTENT_WIDTH;
                    
                    const newWidth = Math.min(
                        Math.max(DEFAULT_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta),
                        maxLeftSidebarWidth
                    );
                    
                    // Only update if width actually changed
                    if (Math.abs(newWidth - leftSidebar.width) > 1) {
                        setLeftSidebarWidth(newWidth);
                    }
                });
            }
        },
        [isResizing, rightSidebar.width, setLeftSidebarWidth, leftSidebar.width]
    );

    // Right sidebar resize handlers
    const startRightResizing = React.useCallback((e: React.MouseEvent) => {
        setIsRightResizing(true);
        rightResizeRef.current = {
            startX: e.clientX,
            startWidth: rightSidebar.width
        };
    }, [rightSidebar.width]);

    const stopRightResizing = React.useCallback(() => {
        setIsRightResizing(false);
    }, []);

    const resizeRight = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isRightResizing) {
                mouseMoveEvent.preventDefault();
                
                // Use requestAnimationFrame for smooth performance
                requestAnimationFrame(() => {
                    const delta = mouseMoveEvent.clientX - rightResizeRef.current.startX;
                    
                    // Berechne die verfügbare Breite für den Hauptinhalt
                    const availableWidth = window.innerWidth - leftSidebar.width;
                    const maxRightSidebarWidth = availableWidth - MIN_MAIN_CONTENT_WIDTH;
                    
                    const newWidth = Math.min(
                        Math.max(DEFAULT_SIDEBAR_WIDTH, rightResizeRef.current.startWidth - delta),
                        maxRightSidebarWidth
                    );
                    
                    // Only update if width actually changed
                    if (Math.abs(newWidth - rightSidebar.width) > 1) {
                        setRightSidebarWidth(newWidth);
                    }
                });
            }
        },
        [isRightResizing, leftSidebar.width, setRightSidebarWidth, rightSidebar.width]
    );

    // Optimized event handling with passive listeners and throttling
    React.useEffect(() => {
        let currentResizeHandler: ((e: MouseEvent) => void) | null = null;
        let currentStopHandler: (() => void) | null = null;

        if (isResizing) {
            currentResizeHandler = resize;
            currentStopHandler = stopResizing;
        } else if (isRightResizing) {
            currentResizeHandler = resizeRight;
            currentStopHandler = stopRightResizing;
        }

        if (currentResizeHandler && currentStopHandler) {
            // Use passive: false for mousemove to allow preventDefault
            window.addEventListener('mousemove', currentResizeHandler, { passive: false });
            window.addEventListener('mouseup', currentStopHandler, { passive: true });
            
            // Disable text selection and pointer events during resize
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
        } else {
            // Re-enable text selection and pointer events after resize
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
        }

        return () => {
            if (currentResizeHandler) {
                window.removeEventListener('mousemove', currentResizeHandler);
            }
            if (currentStopHandler) {
                window.removeEventListener('mouseup', currentStopHandler);
            }
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
        };
    }, [isResizing, isRightResizing, resize, resizeRight, stopResizing, stopRightResizing]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLeftFullscreenToggle = () => {
        if (leftSidebar.isCollapsed) {
            setLeftSidebarCollapsed(false);
            return;
        }
        setLeftSidebarFullscreen(!leftSidebar.isFullscreen);
    };

    const handleRightFullscreenToggle = () => {
        if (rightSidebar.isCollapsed) {
            setRightSidebarCollapsed(false);
            return;
        }
        setRightSidebarFullscreen(!rightSidebar.isFullscreen);
    };

    const handleLeftCollapseToggle = () => {
        setLeftSidebarCollapsed(!leftSidebar.isCollapsed);
    };

    const handleRightCollapseToggle = () => {
        setRightSidebarCollapsed(!rightSidebar.isCollapsed);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Left Sidebar */}
            <Box sx={{ position: 'relative' }}>
                {/* Collapse Toggle Button for collapsed state */}
                {leftSidebar.isCollapsed && !rightSidebar.isFullscreen && (
                    <IconButton 
                        onClick={handleLeftCollapseToggle}
                        size="small"
                        sx={{ 
                            position: 'absolute', 
                            left: -5,
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            zIndex: 1300,
                            bgcolor: 'background.paper',
                            boxShadow: 2,
                            width: 32,
                            height: 32,
                            '&:hover': {
                                bgcolor: 'background.paper',
                            }
                        }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                )}
                <Drawer
                    variant={isMobile ? 'temporary' : 'permanent'}
                    open={isMobile ? mobileOpen : !leftSidebar.isCollapsed}
                    onClose={handleDrawerToggle}
                    sx={{
                        width: leftSidebar.isFullscreen ? '100%' : (leftSidebar.isCollapsed ? COLLAPSED_WIDTH : leftSidebar.width),
                        flexShrink: 0,
                        display: rightSidebar.isFullscreen ? 'none' : 'block',
                        '& .MuiDrawer-paper': {
                            width: leftSidebar.isFullscreen ? '100%' : (leftSidebar.isCollapsed ? COLLAPSED_WIDTH : leftSidebar.width),
                            boxSizing: 'border-box',
                            border: 'none',
                            boxShadow: leftSidebar.isFullscreen ? 'none' : 1,
                            transition: isResizing ? 'none' : theme.transitions.create(['width', 'margin', 'box-shadow'], {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        },
                    }}
                >
                    <Box
                        ref={sidebarRef}
                        sx={{
                            height: '100%',
                            position: 'relative',
                            userSelect: isResizing ? 'none' : 'auto',
                            overflow: 'hidden'
                        }}
                    >
                        <Box sx={{
                            height: '100%',
                            width: '100%',
                            overflow: 'auto'
                        }}>
                            {/* Fullscreen Button - top right */}
                            <IconButton 
                                onClick={handleLeftFullscreenToggle}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    right: 16,
                                    top: 14,
                                    zIndex: 10
                                }}
                            >
                                {leftSidebar.isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                            </IconButton>
                            
                            {/* Collapse Toggle Button - middle right edge */}
                            <IconButton 
                                onClick={handleLeftCollapseToggle}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    right: -5,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 1299,
                                    bgcolor: 'background.paper',
                                    boxShadow: 2,
                                    width: 32,
                                    height: 32,
                                    '&:hover': {
                                        bgcolor: 'background.paper',
                                    }
                                }}
                            >
                                <ChevronLeftIcon />
                            </IconButton>
                            
                            {/* Optimized Resize Handle */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '8px', // Slightly wider for better UX
                                    cursor: 'ew-resize',
                                    zIndex: 1210,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    '&:active': {
                                        bgcolor: 'action.selected',
                                    },
                                    // Remove transition during resize for better performance
                                    transition: isResizing ? 'none' : 'background-color 0.2s',
                                    // Optimize for touch devices
                                    touchAction: 'none',
                                }}
                                onMouseDown={startResizing}
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    const touch = e.touches[0];
                                    startResizing({ clientX: touch.clientX } as React.MouseEvent);
                                }}
                            />
                            
                            {/* Sidebar content */}
                            <EmployeeSidebar/>
                        </Box>
                    </Box>
                </Drawer>
            </Box>
            
            {/* Main Content */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    height: '100vh',
                    overflow: 'auto',
                    display: leftSidebar.isFullscreen || rightSidebar.isFullscreen ? 'none' : 'block',
                }}
            >
                <Outlet />
            </Box>
            
            {/* Right Sidebar */}
            <Box sx={{ position: 'relative' }}>
                {/* Collapse Toggle Button for collapsed state */}
                {rightSidebar.isCollapsed && !leftSidebar.isFullscreen && (
                    <IconButton 
                        onClick={handleRightCollapseToggle}
                        size="small"
                        sx={{ 
                            position: 'absolute', 
                            right: -5,
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            zIndex: 1300,
                            bgcolor: 'background.paper',
                            boxShadow: 2,
                            width: 32,
                            height: 32,
                            '&:hover': {
                                bgcolor: 'background.paper',
                            }
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                )}
                <Drawer
                    variant={isMobile ? 'temporary' : 'permanent'}
                    open={isMobile ? mobileOpen : !rightSidebar.isCollapsed}
                    onClose={handleDrawerToggle}
                    anchor="right"
                    sx={{
                        width: rightSidebar.isFullscreen ? '100%' : (rightSidebar.isCollapsed ? COLLAPSED_WIDTH : rightSidebar.width),
                        flexShrink: 0,
                        display: leftSidebar.isFullscreen ? 'none' : 'block',
                        '& .MuiDrawer-paper': {
                            width: rightSidebar.isFullscreen ? '100%' : (rightSidebar.isCollapsed ? COLLAPSED_WIDTH : rightSidebar.width),
                            boxSizing: 'border-box',
                            border: 'none',
                            boxShadow: rightSidebar.isFullscreen ? 'none' : 1,
                            transition: isRightResizing ? 'none' : theme.transitions.create(['width', 'margin', 'box-shadow'], {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        },
                    }}
                >
                    <Box
                        ref={rightSidebarRef}
                        sx={{
                            height: '100%',
                            position: 'relative',
                            userSelect: isRightResizing ? 'none' : 'auto',
                            overflow: 'hidden'
                        }}
                    >
                        <Box sx={{
                            height: '100%',
                            width: '100%',
                            overflow: 'auto'
                        }}>
                            {/* Fullscreen Button - top left */}
                            <IconButton 
                                onClick={handleRightFullscreenToggle}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    left: 16,
                                    top: 14,
                                    zIndex: 10
                                }}
                            >
                                {rightSidebar.isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                            </IconButton>
                            
                            {/* Collapse Toggle Button - middle left edge */}
                            <IconButton 
                                onClick={handleRightCollapseToggle}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    left: -5,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 1299,
                                    bgcolor: 'background.paper',
                                    boxShadow: 2,
                                    width: 32,
                                    height: 32,
                                    '&:hover': {
                                        bgcolor: 'background.paper',
                                    }
                                }}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                            
                            {/* Optimized Resize Handle */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '8px', // Slightly wider for better UX
                                    cursor: 'ew-resize',
                                    zIndex: 1210,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    '&:active': {
                                        bgcolor: 'action.selected',
                                    },
                                    // Remove transition during resize for better performance
                                    transition: isRightResizing ? 'none' : 'background-color 0.2s',
                                    // Optimize for touch devices
                                    touchAction: 'none',
                                }}
                                onMouseDown={startRightResizing}
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    const touch = e.touches[0];
                                    startRightResizing({ clientX: touch.clientX } as React.MouseEvent);
                                }}
                            />
                            
                            {/* Sidebar content */}
                            <TourPlanSidebar />
                        </Box>
                    </Box>
                </Drawer>
            </Box>
            
            {/* Global Notification Snackbar */}
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={closeNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={closeNotification} 
                    severity={notification.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>

            {/* Global Loading Snackbar */}
            <Snackbar
                open={loading.active}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    icon={<CircularProgress size={20} color="inherit" />}
                    severity="info"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {loading.message || 'Vorgang läuft ...'}
                </Alert>
            </Snackbar>
        </Box>
    );
}; 