import React from 'react';
import { Box, IconButton, Drawer, useTheme, useMediaQuery } from '@mui/material';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { useLayoutStore, useUserStore } from '../../stores';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from '../employees/EmployeeSidebar';
import { TourPlanSidebar } from '../patients/TourPlanSidebar';

const COLLAPSED_WIDTH = 0;
const LEFT_SIDEBAR_WIDTH = '40%';
const RIGHT_SIDEBAR_WIDTH = '50%';

export const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    
    // Get layout state and actions from store
    const {
        leftSidebar,
        rightSidebar,
        setLeftSidebarFullscreen,
        setRightSidebarFullscreen,
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
                        width: leftSidebar.isFullscreen ? '100%' : (leftSidebar.isCollapsed ? COLLAPSED_WIDTH : LEFT_SIDEBAR_WIDTH),
                        flexShrink: 0,
                        display: rightSidebar.isFullscreen ? 'none' : 'block',
                        '& .MuiDrawer-paper': {
                            width: leftSidebar.isFullscreen ? '100%' : (leftSidebar.isCollapsed ? COLLAPSED_WIDTH : LEFT_SIDEBAR_WIDTH),
                            boxSizing: 'border-box',
                            border: 'none',
                            boxShadow: leftSidebar.isFullscreen ? 'none' : 1,
                            transition: theme.transitions.create(['width', 'margin', 'box-shadow'], {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        },
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            position: 'relative',
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
                        width: rightSidebar.isFullscreen ? '100%' : (rightSidebar.isCollapsed ? COLLAPSED_WIDTH : RIGHT_SIDEBAR_WIDTH),
                        flexShrink: 0,
                        display: leftSidebar.isFullscreen ? 'none' : 'block',
                        '& .MuiDrawer-paper': {
                            width: rightSidebar.isFullscreen ? '100%' : (rightSidebar.isCollapsed ? COLLAPSED_WIDTH : RIGHT_SIDEBAR_WIDTH),
                            boxSizing: 'border-box',
                            border: 'none',
                            boxShadow: rightSidebar.isFullscreen ? 'none' : 1,
                            transition: theme.transitions.create(['width', 'margin', 'box-shadow'], {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        },
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            position: 'relative',
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
                            
                            {/* Sidebar content */}
                            <TourPlanSidebar />
                        </Box>
                    </Box>
                </Drawer>
            </Box>
        </Box>
    );
}; 