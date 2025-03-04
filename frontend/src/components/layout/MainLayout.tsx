import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useTheme, useMediaQuery, Button } from '@mui/material';
import { Menu as MenuIcon, Map as MapIcon } from '@mui/icons-material';
import { useUser } from '../../contexts/UserContext';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from '../employees/EmployeeSidebar';

const DRAWER_WIDTH = 340;
const DRAWER_WIDTH_EXPANDED = 800;
const APPBAR_HEIGHT = 64;

export const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { currentUser, setCurrentUser } = useUser();
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

    const handleUserChange = () => {
        setCurrentUser(null);
        navigate('/select-user');
    };

    const handleSidebarExpandToggle = () => {
        setSidebarExpanded(!sidebarExpanded);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* App Bar */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: theme.zIndex.drawer + 1,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        SAPV Routenplanung
                    </Typography>
                    <Button
                        color="inherit"
                        startIcon={<MapIcon />}
                        onClick={() => navigate('/')}
                    >
                        Karte
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1">
                            {currentUser?.name} ({currentUser?.area})
                        </Typography>
                        <IconButton color="inherit" onClick={handleUserChange}>
                            <Typography variant="button">
                                Benutzer wechseln
                            </Typography>
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={handleDrawerToggle}
                sx={{
                    width: sidebarExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: sidebarExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    },
                }}
            >
                <Toolbar /> {/* Spacer for AppBar */}
                <Box sx={{ overflow: 'auto', height: '100%' }}>
                    <EmployeeSidebar 
                        expanded={sidebarExpanded}
                        onExpandToggle={handleSidebarExpandToggle}
                    />
                </Box>
            </Drawer>

            {/* Main content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'hidden',
                    pt: `${APPBAR_HEIGHT}px`,
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}; 