import React from 'react';
import { Box, IconButton, Drawer, useTheme, useMediaQuery } from '@mui/material';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { useUserStore, useLayoutStore } from '../../stores';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from '../employees/EmployeeSidebar';
import { TourPlanSidebar } from '../patients/TourPlanSidebar';

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
    const { currentUser } = useUserStore();
    const navigate = useNavigate();

    // Redirect to user selection if no user is selected
    React.useEffect(() => {
        if (!currentUser) {
            navigate('/select-user');
        }
    }, [currentUser, navigate]);

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
                const delta = mouseMoveEvent.clientX - resizeRef.current.startX;
                
                // Berechne die verfügbare Breite für den Hauptinhalt
                const availableWidth = window.innerWidth - rightSidebar.width;
                const maxLeftSidebarWidth = availableWidth - MIN_MAIN_CONTENT_WIDTH;
                
                const newWidth = Math.min(
                    Math.max(DEFAULT_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta),
                    maxLeftSidebarWidth
                );
                setLeftSidebarWidth(newWidth);
            }
        },
        [isResizing, rightSidebar.width, setLeftSidebarWidth]
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
                const delta = mouseMoveEvent.clientX - rightResizeRef.current.startX;
                
                // Berechne die verfügbare Breite für den Hauptinhalt
                const availableWidth = window.innerWidth - leftSidebar.width;
                const maxRightSidebarWidth = availableWidth - MIN_MAIN_CONTENT_WIDTH;
                
                const newWidth = Math.min(
                    Math.max(DEFAULT_SIDEBAR_WIDTH, rightResizeRef.current.startWidth - delta),
                    maxRightSidebarWidth
                );
                setRightSidebarWidth(newWidth);
            }
        },
        [isRightResizing, leftSidebar.width, setRightSidebarWidth]
    );

    React.useEffect(() => {
        if (isResizing || isRightResizing) {
            window.addEventListener('mousemove', isResizing ? resize : resizeRight);
            window.addEventListener('mouseup', isResizing ? stopResizing : stopRightResizing);
            // Disable text selection and pointer events during resize
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
        } else {
            // Re-enable text selection and pointer events after resize
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            window.removeEventListener('mousemove', resizeRight);
            window.removeEventListener('mouseup', stopRightResizing);
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
        };
    }, [resize, stopResizing, resizeRight, stopRightResizing, isResizing, isRightResizing]);

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
                            
                            {/* Resize Handle */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '5px',
                                    cursor: 'ew-resize',
                                    zIndex: 1210,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseDown={startResizing}
                            />
                            
                            {/* Sidebar content */}
                            <EmployeeSidebar />
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
                            
                            {/* Resize Handle */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '5px',
                                    cursor: 'ew-resize',
                                    zIndex: 1210,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseDown={startRightResizing}
                            />
                            
                            {/* Sidebar content */}
                            <TourPlanSidebar />
                        </Box>
                    </Box>
                </Drawer>
            </Box>
        </Box>
    );
}; 