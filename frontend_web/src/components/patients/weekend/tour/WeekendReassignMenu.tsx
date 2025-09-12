import React from 'react';
import { 
    Menu, 
    MenuItem, 
    Typography, 
    Box, 
    Chip, 
    ListItemText 
} from '@mui/material';

const weekendAreas = ['Nord', 'Mitte', 'Süd'] as const;
type WeekendArea = typeof weekendAreas[number];

interface WeekendReassignMenuProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    currentArea: WeekendArea;
    onMoveAllPatients: (targetArea: string) => void;
}

const getAreaColor = (area: WeekendArea) => {
    switch (area) {
        case 'Nord': return '#1976d2';
        case 'Mitte': return '#7b1fa2';
        case 'Süd': return '#388e3c';
        default: return '#ff9800';
    }
};

export const WeekendReassignMenu: React.FC<WeekendReassignMenuProps> = ({
    open,
    anchorEl,
    onClose,
    currentArea,
    onMoveAllPatients
}) => {
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiPaper-root': {
                    maxHeight: 300,
                    overflow: 'auto',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    borderRadius: 2
                }
            }}
        >
            {/* Weekend areas section */}
            <Typography 
                variant="subtitle2" 
                sx={{ px: 2, py: 1, bgcolor: 'background.default', fontWeight: 'bold' }}
            >
                Wochenend-Touren
            </Typography>
            
            {weekendAreas.filter(a => a !== currentArea).map((targetArea) => {
                const areaColor = getAreaColor(targetArea);
                return (
                    <MenuItem 
                        key={targetArea}
                        onClick={() => onMoveAllPatients(targetArea)}
                        sx={{
                            py: 1,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ListItemText>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    label={targetArea}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        bgcolor: areaColor,
                                        color: 'white',
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.75rem'
                                        }
                                    }}
                                />
                            </Box>
                        </ListItemText>
                    </MenuItem>
                );
            })}
        </Menu>
    );
};
