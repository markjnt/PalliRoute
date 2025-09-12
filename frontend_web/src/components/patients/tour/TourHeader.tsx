import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Employee, Route } from '../../../types/models';
import { getColorForTour, employeeTypeColors } from '../../../utils/colors';

interface TourHeaderProps {
    employee: Employee;
    route?: Route;
}

export const TourHeader: React.FC<TourHeaderProps> = ({ employee, route }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Area chip (N/S) */}
                {route && route.area && (
                    <Chip
                        label={route.area.includes('Nordkreis') ? 'N' : 'S'}
                        size="small"
                        sx={{
                            height: '20px',
                            fontSize: '0.7rem',
                            bgcolor: route.area.includes('Nordkreis') ? 'primary.main' : 'secondary.main',
                            color: 'white',
                            fontWeight: 'bold',
                            mr: 0.5
                        }}
                    />
                )}
                
                {/* Employee name */}
                <Typography 
                    variant="h6" 
                    component="h3" 
                    sx={{ 
                        fontWeight: 'bold',
                        color: employee.id ? getColorForTour(employee.id) : 'text.primary'
                    }}
                >
                    {employee.first_name} {employee.last_name}
                </Typography>
            </Box>
            
            {/* Employee function chip */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                mt: 0.5
            }}>
                <Chip 
                    label={employee.function}
                    size="small"
                    sx={{ 
                        height: '20px',
                        fontSize: '0.7rem',
                        backgroundColor: employeeTypeColors[employee.function] || employeeTypeColors.default,
                        color: 'white',
                    }}
                />
            </Box>
        </Box>
    );
};
