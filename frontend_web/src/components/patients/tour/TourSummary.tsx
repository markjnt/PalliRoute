import React from 'react';
import { Box, Chip } from '@mui/material';
import { 
    Home as HomeIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    AddCircle as AddCircleIcon
} from '@mui/icons-material';
import { Patient } from '../../../types/models';

interface TourSummaryProps {
    sortedRoutePatients: Patient[];  // Only normal HB/NA patients (not tour_employee)
    normalTkPatients: Patient[];  // Only normal TK patients (not tour_employee)
    emptyTypePatients: Patient[];
}

export const TourSummary: React.FC<TourSummaryProps> = ({
    sortedRoutePatients,
    normalTkPatients,
    emptyTypePatients
}) => {
    // sortedRoutePatients already contains only normal HB/NA patients (tour_employee patients are filtered out)
    const routeCount = sortedRoutePatients.length;
    
    return (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                {routeCount > 0 && (
                    <Chip 
                        size="small" 
                        icon={<HomeIcon fontSize="small" />} 
                        label={routeCount} 
                        color="primary" 
                        variant="outlined" 
                    />
                )}
                {normalTkPatients.length > 0 && (
                    <Chip 
                        size="small" 
                        icon={<PhoneIcon fontSize="small" />} 
                        label={normalTkPatients.length} 
                        color="success" 
                        variant="outlined" 
                    />
                )}
                {emptyTypePatients.length > 0 && (
                    <Chip 
                        size="small" 
                        icon={<PersonIcon fontSize="small" />} 
                        label={emptyTypePatients.length} 
                        color="default" 
                        variant="outlined" 
                    />
                )}
            </Box>
        </Box>
    );
};
