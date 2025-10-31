import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const weekendAreas = ['Nord', 'Mitte', 'Süd'] as const;
type WeekendArea = typeof weekendAreas[number];

interface WeekendTourHeaderProps {
    area: WeekendArea;
}

export const WeekendTourHeader: React.FC<WeekendTourHeaderProps> = ({ area }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* N/S Chips basierend auf Bereich */}
            {(() => {
                if (area === 'Nord') {
                    return (
                        <Chip
                            label="N"
                            size="small"
                            sx={{
                                height: '20px',
                                fontSize: '0.7rem',
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                mr: 0.5
                            }}
                        />
                    );
                } else if (area === 'Süd') {
                    return (
                        <Chip
                            label="S"
                            size="small"
                            sx={{
                                height: '20px',
                                fontSize: '0.7rem',
                                bgcolor: 'secondary.main',
                                color: 'white',
                                fontWeight: 'bold',
                                mr: 0.5
                            }}
                        />
                    );
                } else if (area === 'Mitte') {
                    return (
                        <Box sx={{ display: 'flex', gap: 0.5, mr: 0.5 }}>
                            <Chip
                                label="N"
                                size="small"
                                sx={{
                                    height: '20px',
                                    fontSize: '0.7rem',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Chip
                                label="S"
                                size="small"
                                sx={{
                                    height: '20px',
                                    fontSize: '0.7rem',
                                    bgcolor: 'secondary.main',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            />
                        </Box>
                    );
                }
                return null;
            })()}
            
            <Typography 
                variant="h6" 
                component="h3" 
                sx={{ 
                    fontWeight: 'bold',
                    color: (() => {
                        switch (area) {
                            case 'Nord': return '#1976d2';
                            case 'Mitte': return '#7b1fa2';
                            case 'Süd': return '#388e3c';
                            default: return '#ff9800';
                        }
                    })()
                }}
            >
                AW {area}
            </Typography>
        </Box>
    );
};
