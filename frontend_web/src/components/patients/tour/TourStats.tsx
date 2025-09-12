import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { AccessTime as AccessTimeIcon, Straighten as StraightenIcon } from '@mui/icons-material';
import { Employee, Route } from '../../../types/models';

interface TourStatsProps {
    employee: Employee;
    route?: Route;
}

export const TourStats: React.FC<TourStatsProps> = ({ employee, route }) => {
    // Calculate utilization
    const duration = route && typeof route.total_duration === 'number' ? route.total_duration : null;
    const targetMinutes = Math.round(420 * ((employee.work_hours || 0) / 100));
    
    let utilization: number | undefined = undefined;
    if (duration !== null && targetMinutes > 0) {
        utilization = (duration / targetMinutes) * 100;
    }
    
    // Determine utilization color
    let utilizationColor = 'success.main';
    if (utilization !== undefined) {
        if (utilization > 100) {
            utilizationColor = 'error.main';
        } else if (utilization > 90) {
            utilizationColor = 'warning.main';
        } else if (utilization > 70) {
            utilizationColor = 'success.light';
        }
    }
    
    // Format time strings for tooltip
    let durationStr = '-';
    let targetStr = '-';
    if (duration !== null) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        durationStr = `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    if (targetMinutes > 0) {
        const targetHours = Math.floor(targetMinutes / 60);
        const targetMins = targetMinutes % 60;
        targetStr = `${targetHours}:${targetMins.toString().padStart(2, '0')}`;
    }
    
    // Format distance
    const distance = route && typeof route.total_distance === 'number' ? route.total_distance : null;
    const distanceStr = distance !== null 
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
