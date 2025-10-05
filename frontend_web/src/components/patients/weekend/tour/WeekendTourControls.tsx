import React from 'react';
import { 
    Box, 
    Button, 
    Tooltip 
} from '@mui/material';
import { 
    Route as RouteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const weekendAreas = ['Nord', 'Mitte', 'Süd'] as const;
type WeekendArea = typeof weekendAreas[number];

interface WeekendTourControlsProps {
    expanded: boolean;
    isOptimizing: boolean;
    tourPatientsCount: number;
    routeId?: number;
    isVisible: boolean;
    onOptimizeRoute: () => void;
    onToggleVisibility: () => void;
}

export const WeekendTourControls: React.FC<WeekendTourControlsProps> = ({
    expanded,
    isOptimizing,
    tourPatientsCount,
    routeId,
    isVisible,
    onOptimizeRoute,
    onToggleVisibility
}) => {
    if (!expanded) return null;

    return (
        <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
            mt: 0.5
        }}>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2, alignItems: 'center' }}>
                {/* Optimize button */}
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RouteIcon />}
                    onClick={onOptimizeRoute}
                    disabled={isOptimizing || tourPatientsCount === 0}
                    sx={{ 
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText'
                        }
                    }}
                >
                    {isOptimizing ? 'Optimiert...' : 'Optimieren'}
                </Button>
                
                
                {/* Visibility toggle button */}
                {routeId !== undefined && (
                    <Tooltip title={isVisible ? 'Route ausblenden' : 'Route einblenden'} arrow>
                        <span>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={onToggleVisibility}
                                sx={{
                                    minWidth: '40px',
                                    width: '40px',
                                    height: '31px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    ml: 0.25,
                                    '&:hover': {
                                        backgroundColor: 'primary.light',
                                        color: 'primary.contrastText'
                                    }
                                }}
                            >
                                {isVisible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
};
