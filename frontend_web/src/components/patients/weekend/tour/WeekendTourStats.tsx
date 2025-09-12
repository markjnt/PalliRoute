import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { AccessTime as AccessTimeIcon, Straighten as StraightenIcon } from '@mui/icons-material';
import { Route } from '../../../../types/models';

const weekendAreas = ['Nord', 'Mitte', 'Süd'] as const;
type WeekendArea = typeof weekendAreas[number];

interface WeekendTourStatsProps {
    area: WeekendArea;
    route?: Route;
}

export const WeekendTourStats: React.FC<WeekendTourStatsProps> = ({ area, route }) => {
    // Calculate utilization (75% work hours = 315 minutes target)
    const targetMinutes = 315; // 75% of 420 minutes (7 hours)
    const duration = route?.total_duration || 0;
    const utilization = targetMinutes > 0 ? (duration / targetMinutes) * 100 : 0;

    // Determine utilization color
    let utilizationColor = 'success.main';
    if (utilization > 100) {
        utilizationColor = 'error.main';
    } else if (utilization > 90) {
        utilizationColor = 'warning.main';
    } else if (utilization > 70) {
        utilizationColor = 'success.light';
    }

    // Format time strings
    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    };

    const durationStr = formatTime(duration);
    const targetStr = formatTime(targetMinutes);

    // Format distance
    const distance = route?.total_distance;
    const distanceStr = distance !== undefined 
        ? distance.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km' 
        : '-';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
            {/* Utilization */}
            <Tooltip title={`${durationStr} / ${targetStr}`} arrow>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: utilization !== undefined ? utilizationColor : 'text.secondary', 
                            fontWeight: utilization !== undefined ? 'bold' : 'normal' 
                        }}
                    >
                        {utilization !== undefined ? `${Math.round(utilization)}%` : '-'}
                    </Typography>
                </Box>
            </Tooltip>
            
            {/* Distance */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StraightenIcon fontSize="small" sx={{ color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                    {distanceStr}
                </Typography>
            </Box>
        </Box>
    );
};
