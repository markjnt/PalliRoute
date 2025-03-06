import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useTheme, useMediaQuery, Button, Menu, MenuItem, Avatar } from '@mui/material';
import { Menu as MenuIcon, Map as MapIcon } from '@mui/icons-material';
import { useUser } from '../../contexts/UserContext';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from '../employees/EmployeeSidebar';
import { User } from '../../types/models';

const DRAWER_WIDTH = 340;
const DRAWER_WIDTH_EXPANDED = 800;
const APPBAR_HEIGHT = 64;

export const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { currentUser, setCurrentUser, users } = useUser();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleUserSelect = (user: User) => {
        setCurrentUser(user);
        handleMenuClose();
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
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
                    position: 'relative',
                }}
            >
                <Outlet />
                <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <Avatar
                        alt={currentUser?.name}
                        src={currentUser?.avatarUrl}
                        onClick={(event) => setAnchorEl(event.currentTarget)}
                        sx={{
                            '&:hover': {
                                cursor: 'pointer',
                                boxShadow: 3,
                                transform: 'scale(1.1)',
                            },
                        }}
                    />
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
                        <MenuItem disabled>
                            <Typography variant="body1">{currentUser?.name}</Typography>
                        </MenuItem>
                        <MenuItem disabled>
                            <Typography variant="body2">{currentUser?.area}</Typography>
                        </MenuItem>
                        <MenuItem onClick={handleUserChange}>
                            Benutzer wechseln
                        </MenuItem>
                        {users.map((user) => (
                            <MenuItem key={user.id} onClick={() => handleUserSelect(user)}>
                                {user.name}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
            </Box>
        </Box>
    );
}; 