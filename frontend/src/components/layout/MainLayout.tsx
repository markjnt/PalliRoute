import React from 'react';
import { Box, IconButton, Drawer, useTheme, useMediaQuery } from '@mui/material';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from '../employees/EmployeeSidebar';
import { TourPlanSidebar } from '../patients/TourPlanSidebar';

const DEFAULT_SIDEBAR_WIDTH = 425;
const MIN_MAIN_CONTENT_WIDTH = 100;
const COLLAPSED_WIDTH = 0;

export const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [isLeftFullscreen, setIsLeftFullscreen] = React.useState(false);
    const [isRightFullscreen, setIsRightFullscreen] = React.useState(false);
    const [sidebarWidth, setSidebarWidth] = React.useState(DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = React.useState(false);
    const [isLeftCollapsed, setIsLeftCollapsed] = React.useState(false);
    const sidebarRef = React.useRef<HTMLDivElement>(null);
    const resizeRef = React.useRef<{
        startX: number;
        startWidth: number;
    }>({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH });
    
    // Right sidebar state
    const [rightSidebarWidth, setRightSidebarWidth] = React.useState(DEFAULT_SIDEBAR_WIDTH);
    const [isRightResizing, setIsRightResizing] = React.useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = React.useState(false);
    const rightSidebarRef = React.useRef<HTMLDivElement>(null);
    const rightResizeRef = React.useRef<{
        startX: number;
        startWidth: number;
    }>({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH });
    
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
            startWidth: sidebarWidth
        };
    }, [sidebarWidth]);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                mouseMoveEvent.preventDefault();
                const delta = mouseMoveEvent.clientX - resizeRef.current.startX;
                
                // Berechne die verfügbare Breite für den Hauptinhalt
                const availableWidth = window.innerWidth - rightSidebarWidth;
                const maxLeftSidebarWidth = availableWidth - MIN_MAIN_CONTENT_WIDTH;
                
                const newWidth = Math.min(
                    Math.max(DEFAULT_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta),
                    maxLeftSidebarWidth
                );
                setSidebarWidth(newWidth);
            }
        },
        [isResizing, rightSidebarWidth]
    );

    // Right sidebar resize handlers
    const startRightResizing = React.useCallback((e: React.MouseEvent) => {
        setIsRightResizing(true);
        rightResizeRef.current = {
            startX: e.clientX,
            startWidth: rightSidebarWidth
        };
    }, [rightSidebarWidth]);

    const stopRightResizing = React.useCallback(() => {
        setIsRightResizing(false);
    }, []);

    const resizeRight = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isRightResizing) {
                mouseMoveEvent.preventDefault();
                const delta = mouseMoveEvent.clientX - rightResizeRef.current.startX;
                
                // Berechne die verfügbare Breite für den Hauptinhalt
                const availableWidth = window.innerWidth - sidebarWidth;
                const maxRightSidebarWidth = availableWidth - MIN_MAIN_CONTENT_WIDTH;
                
                const newWidth = Math.min(
                    Math.max(DEFAULT_SIDEBAR_WIDTH, rightResizeRef.current.startWidth - delta),
                    maxRightSidebarWidth
                );
                setRightSidebarWidth(newWidth);
            }
        },
        [isRightResizing, sidebarWidth]
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
        if (isLeftCollapsed) {
            setIsLeftCollapsed(false);
            return;
        }
        setIsLeftFullscreen(!isLeftFullscreen);
        if (isRightFullscreen) setIsRightFullscreen(false);
    };

    const handleRightFullscreenToggle = () => {
        if (isRightCollapsed) {
            setIsRightCollapsed(false);
            return;
        }
        setIsRightFullscreen(!isRightFullscreen);
        if (isLeftFullscreen) setIsLeftFullscreen(false);
    };

    const handleLeftCollapseToggle = () => {
        setIsLeftCollapsed(!isLeftCollapsed);
        if (isLeftFullscreen) setIsLeftFullscreen(false);
    };

    const handleRightCollapseToggle = () => {
        setIsRightCollapsed(!isRightCollapsed);
        if (isRightFullscreen) setIsRightFullscreen(false);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Left Sidebar */}
            <Box sx={{ position: 'relative' }}>
                {/* Collapse Toggle Button for collapsed state */}
                {isLeftCollapsed && !isRightFullscreen && (
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
                    open={isMobile ? mobileOpen : !isLeftCollapsed}
                    onClose={handleDrawerToggle}
                    sx={{
                        width: isLeftFullscreen ? '100%' : (isLeftCollapsed ? COLLAPSED_WIDTH : sidebarWidth),
                        flexShrink: 0,
                        display: isRightFullscreen ? 'none' : 'block',
                        '& .MuiDrawer-paper': {
                            width: isLeftFullscreen ? '100%' : (isLeftCollapsed ? COLLAPSED_WIDTH : sidebarWidth),
                            boxSizing: 'border-box',
                            border: 'none',
                            boxShadow: isLeftFullscreen ? 'none' : 1,
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
                                {isLeftFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
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
                                    zIndex: 10,
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

                            <EmployeeSidebar />
                        </Box>

                        {/* Resize Handle */}
                        {!isLeftFullscreen && !isMobile && (
                            <Box
                                onMouseDown={startResizing}
                                sx={{
                                    position: 'absolute',
                                    right: -5,
                                    top: 0,
                                    height: '100%',
                                    width: '12px',
                                    cursor: 'ew-resize',
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.1)'
                                    },
                                    '&:active': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.15)'
                                    }
                                }}
                            />
                        )}
                    </Box>
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'hidden',
                    position: 'relative',
                    display: (isLeftFullscreen || isRightFullscreen) ? 'none' : 'block',
                    transition: (isResizing || isRightResizing) ? 'none' : theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    pointerEvents: (isResizing || isRightResizing) ? 'none' : 'auto'
                }}
            >
                <Outlet />
            </Box>

            {/* Right Sidebar */}
            <Box sx={{ position: 'relative' }}>
                {/* Collapse Toggle Button for collapsed state */}
                {isRightCollapsed && !isLeftFullscreen && (
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
                    variant="permanent"
                    anchor="right"
                    open={!isRightCollapsed}
                    sx={{
                        width: isRightFullscreen ? '100%' : (isRightCollapsed ? COLLAPSED_WIDTH : rightSidebarWidth),
                        flexShrink: 0,
                        display: isLeftFullscreen ? 'none' : 'block',
                        '& .MuiDrawer-paper': {
                            width: isRightFullscreen ? '100%' : (isRightCollapsed ? COLLAPSED_WIDTH : rightSidebarWidth),
                            boxSizing: 'border-box',
                            border: 'none',
                            boxShadow: isRightFullscreen ? 'none' : 1,
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
                                {isRightFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
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
                                    zIndex: 10,
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

                            <TourPlanSidebar />
                        </Box>

                        {/* Resize Handle */}
                        {!isRightFullscreen && !isMobile && (
                            <Box
                                onMouseDown={startRightResizing}
                                sx={{
                                    position: 'absolute',
                                    left: -5,
                                    top: 0,
                                    height: '100%',
                                    width: '12px',
                                    cursor: 'ew-resize',
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.1)'
                                    },
                                    '&:active': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.15)'
                                    }
                                }}
                            />
                        )}
                    </Box>
                </Drawer>
            </Box>
        </Box>
    );
}; 