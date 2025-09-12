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
    hbPatients: Patient[];
    tkPatients: Patient[];
    naPatients: Patient[];
    emptyTypePatients: Patient[];
}

export const TourSummary: React.FC<TourSummaryProps> = ({
    hbPatients,
    tkPatients,
    naPatients,
    emptyTypePatients
}) => {
    return (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                {hbPatients.length > 0 && (
                    <Chip 
                        size="small" 
                        icon={<HomeIcon fontSize="small" />} 
                        label={hbPatients.length} 
                        color="primary" 
                        variant="outlined" 
                    />
                )}
                {tkPatients.length > 0 && (
                    <Chip 
                        size="small" 
                        icon={<PhoneIcon fontSize="small" />} 
                        label={tkPatients.length} 
                        color="success" 
                        variant="outlined" 
                    />
                )}
                {naPatients.length > 0 && (
                    <Chip 
                        size="small" 
                        icon={<AddCircleIcon fontSize="small" />} 
                        label={naPatients.length} 
                        color="secondary" 
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
