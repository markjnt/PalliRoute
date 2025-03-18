import React from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Chip,
    Badge
} from '@mui/material';
import { 
    Phone as PhoneIcon,
    PersonOutline as PersonIcon,
    Home as HomeIcon
} from '@mui/icons-material';
import { Patient, Appointment } from '../../types/models';

interface PatientCardProps {
    patient: Patient;
    appointments: Appointment[];
    visitType: 'HB' | 'NA' | 'TK' | 'none';
    index?: number;  // For numbered list of HB visits
    compact?: boolean; // For more compact display in TK, NA, and no-appointment sections
}

export const PatientCard: React.FC<PatientCardProps> = ({ 
    patient, 
    appointments,
    visitType,
    index,
    compact = false
}) => {
    const getBgColor = () => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.08)'; // Light blue
            case 'NA': return 'rgba(156, 39, 176, 0.08)'; // Light purple
            case 'TK': return 'rgba(76, 175, 80, 0.08)';  // Light green
            default: return 'rgba(244, 244, 244, 0.8)';    // Light gray
        }
    };

    const getAppointmentInfo = () => {
        if (appointments.length === 0) return null;
        
        const appt = appointments[0];
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: compact ? 0 : 1, gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                    label={appt.visit_type} 
                    size="small" 
                    color={
                        appt.visit_type === 'HB' ? 'primary' :
                        appt.visit_type === 'NA' ? 'secondary' : 'success'
                    }
                />
                {appt.time && (
                    <Typography variant="body2" color="text.secondary">
                        {appt.time}
                    </Typography>
                )}
                {appt.info && (
                    <Typography variant="body2" color="text.secondary">
                        {appt.info}
                    </Typography>
                )}
            </Box>
        );
    };

    return (
        <Card 
            variant="outlined" 
            sx={{ 
                mb: compact ? 1 : 2,
                backgroundColor: getBgColor(),
                position: 'relative',
                width: '100%'
            }}
        >
            <CardContent sx={{ py: compact ? 1 : 2, px: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start'
                }}>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            {index !== undefined && (
                                <Badge
                                    badgeContent={index}
                                    color="primary"
                                    sx={{ 
                                        mr: 1,
                                        '& .MuiBadge-badge': {
                                            fontSize: '0.8rem',
                                            height: '22px',
                                            minWidth: '22px',
                                            borderRadius: '50%'
                                        }
                                    }}
                                />
                            )}
                            <Typography 
                                variant={compact ? "body1" : "h6"} 
                                component="div" 
                                fontWeight="bold"
                                gutterBottom={!compact}
                            >
                                {patient.last_name}, {patient.first_name}
                            </Typography>
                            
                            {patient.area && !compact && (
                                <Chip 
                                    label={patient.area} 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>
                        
                        {!compact && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <HomeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {patient.street}, {patient.zip_code} {patient.city}
                                </Typography>
                            </Box>
                        )}
                        
                        {patient.phone1 && !compact && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {patient.phone1}
                                </Typography>
                            </Box>
                        )}
                        
                        {getAppointmentInfo()}
                        
                        {compact && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    {patient.street}
                                </Typography>
                                {patient.area && (
                                    <Chip 
                                        label={patient.area} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ 
                                            height: '18px',
                                            '& .MuiChip-label': {
                                                fontSize: '0.625rem',
                                                px: 0.8
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}; 