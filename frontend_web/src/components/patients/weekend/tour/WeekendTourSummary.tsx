import React from 'react';
import { Box, Chip } from '@mui/material';
import { 
    Home as HomeIcon,
    Phone as PhoneIcon,
    AddCircle as AddCircleIcon
} from '@mui/icons-material';

interface WeekendTourSummaryProps {
    hbAppointmentsCount: number;
    tkAppointmentsCount: number;
    naAppointmentsCount: number;
}

export const WeekendTourSummary: React.FC<WeekendTourSummaryProps> = ({
    hbAppointmentsCount,
    tkAppointmentsCount,
    naAppointmentsCount
}) => {
    return (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                {hbAppointmentsCount > 0 && (
                    <Chip 
                        size="small" 
                        icon={<HomeIcon fontSize="small" />} 
                        label={hbAppointmentsCount} 
                        color="primary" 
                        variant="outlined" 
                    />
                )}
                {tkAppointmentsCount > 0 && (
                    <Chip 
                        size="small" 
                        icon={<PhoneIcon fontSize="small" />} 
                        label={tkAppointmentsCount} 
                        color="success" 
                        variant="outlined" 
                    />
                )}
                {naAppointmentsCount > 0 && (
                    <Chip 
                        size="small" 
                        icon={<AddCircleIcon fontSize="small" />} 
                        label={naAppointmentsCount} 
                        color="secondary" 
                        variant="outlined" 
                    />
                )}
            </Box>
        </Box>
    );
};
