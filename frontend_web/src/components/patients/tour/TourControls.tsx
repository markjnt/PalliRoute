import React from 'react';
import { 
    Box, 
    Button, 
    Tooltip 
} from '@mui/material';
import { 
    Route as RouteIcon,
    SwapHoriz as SwapHorizIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface OptimizeState {
    isOptimizing: boolean;
}

interface TourControlsProps {
    expanded: boolean;
    optimizeState: OptimizeState;
    tourPatientsCount: number;
    routeId?: number;
    isVisible: boolean;
    onOptimizeRoute: () => void;
    onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
    onToggleVisibility: () => void;
}

export const TourControls: React.FC<TourControlsProps> = ({
    expanded,
    optimizeState,
    tourPatientsCount,
    routeId,
    isVisible,
    onOptimizeRoute,
    onMenuOpen,
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
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                {/* Optimize button */}
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RouteIcon />}
                    onClick={onOptimizeRoute}
                    disabled={optimizeState.isOptimizing || tourPatientsCount === 0}
                    sx={{ 
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText'
                        }
                    }}
                >
                    {optimizeState.isOptimizing ? 'Optimiert...' : 'Optimieren'}
                </Button>
                
                {/* Reassign button */}
                <Tooltip title="Alle neu zuweisen" arrow>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onMenuOpen}
                            disabled={tourPatientsCount === 0}
                            sx={{
                                left: '2px', 
                                minWidth: '40px',
                                width: '40px',
                                px: 0,
                                height: '31px',
                                display: 'flex',
                                alignItems: 'center',
                                '&:hover': {
                                    backgroundColor: 'primary.light',
                                    color: 'primary.contrastText'
                                }
                            }}
                        >
                            <SwapHorizIcon fontSize="small" />
                        </Button>
                    </span>
                </Tooltip>
                
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
                                    ml: 0.5,
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
