import React, { useRef, useState } from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Chip,
    Tooltip,
    IconButton,
    Menu,
    MenuItem,
    ListItemText,
    Divider
} from '@mui/material';
import { 
    Phone as PhoneIcon,
    Home as HomeIcon,
    Info as InfoIcon,
    SwapHoriz as SwapHorizIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { Patient, Appointment, Weekday } from '../../../types/models';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useMoveAppointment } from '../../../services/queries/useAppointments';

interface WeekendPatientCardProps {
    patient: Patient;
    appointments: Appointment[];
    visitType: 'HB' | 'NA' | 'TK';
    index?: number;  // For numbered list of visits
    compact?: boolean; // For more compact display
    selectedDay: Weekday; // Der ausgewählte Wochentag
    onMoveUp?: (patientId: number) => void; // New prop for moving patient up
    onMoveDown?: (patientId: number) => void; // New prop for moving patient down
    isFirst?: boolean; // New prop to indicate if this is the first patient in the list
    isLast?: boolean; // New prop to indicate if this is the last patient in the list
    area: string; // Weekend area (Nord, Mitte, Süd)
}

export const WeekendPatientCard: React.FC<WeekendPatientCardProps> = ({ 
    patient, 
    appointments,
    visitType,
    index,
    compact = false,
    selectedDay,
    onMoveUp,
    onMoveDown,
    isFirst = false,
    isLast = false,
    area
}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { setNotification, setLoading, resetLoading } = useNotificationStore();
    const moveAppointment = useMoveAppointment();
    
    // Get current appointment for the selected day
    const selectedDayAppointment = appointments.find(app => app.weekday === selectedDay);

    const handleAreaMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleAreaMenuClose = () => {
        setAnchorEl(null);
    };

    const getBgColor = () => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.08)'; // Light blue
            case 'NA': return 'rgba(244, 67, 54, 0.08)'; // Light red
            case 'TK': return 'rgba(76, 175, 80, 0.08)';  // Light green
            default: return 'rgba(158, 158, 158, 0.08)';  // Light gray
        }
    };

    const getVisitChipStyles = () => {
        switch (visitType) {
            case 'HB':
                return { bgcolor: '#1976d2', label: 'HB' };
            case 'NA':
                return { bgcolor: '#f44336', label: 'NA' };
            case 'TK':
                return { bgcolor: '#4caf50', label: 'TK' };
            default:
                return { bgcolor: '#9e9e9e', label: visitType ?? 'Termin' };
        }
    };
    const visitChipStyles = getVisitChipStyles();

    const getAreaColor = (area: string) => {
        switch (area) {
            case 'Nord': return '#1976d2';
            case 'Mitte': return '#7b1fa2';
            case 'Süd': return '#388e3c';
            default: return '#ff9800';
        }
    };

    const handleMoveToArea = async (targetArea: string) => {
        try {
            setLoading('Patient wird zugewiesen...');
            
            if (!selectedDayAppointment) {
                setNotification('Kein Termin für den ausgewählten Tag gefunden', 'error');
                return;
            }

            // For weekend appointments, we move by area instead of employee
            if (!selectedDayAppointment.id) {
                setNotification('Termin-ID nicht gefunden', 'error');
                return;
            }

            await moveAppointment.mutateAsync({
                appointmentId: selectedDayAppointment.id,
                sourceEmployeeId: undefined, // No source employee for weekend
                targetEmployeeId: undefined, // No target employee for weekend
                sourceArea: area,
                targetArea: targetArea
            });
            
            handleAreaMenuClose();
            resetLoading();
            setNotification(`Patient erfolgreich zu ${targetArea} zugewiesen`, 'success');
        } catch (error) {
            console.error('Fehler beim Zuweisen des Patienten:', error);
            setNotification('Fehler beim Zuweisen des Patienten', 'error');
        }
    };

    // Handle move up/down actions
    const handleMoveUp = () => {
        if (onMoveUp && patient.id && !isFirst) {
            onMoveUp(patient.id);
        }
    };

    const handleMoveDown = () => {
        if (onMoveDown && patient.id && !isLast) {
            onMoveDown(patient.id);
        }
    };

    // Available weekend areas
    const weekendAreas = ['Nord', 'Mitte', 'Süd'];

    return (
        <Card 
            variant="outlined" 
            sx={{ 
                mb: 2,
                backgroundColor: getBgColor(),
                position: 'relative',
                width: '100%',
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: 2,
                    transform: 'translateY(-2px)'
                }
            }}
        >
            {/* Reordering arrows */}
            <Box sx={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px', 
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                borderRadius: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                {/* Up arrow - hidden for first patient */}
                {!isFirst && onMoveUp && (
                    <Tooltip title="Nach oben verschieben" arrow placement="top">
                        <IconButton
                            size="small"
                            onClick={handleMoveUp}
                            sx={{ 
                                color: 'text.secondary',
                                width: 24,
                                height: 24,
                                minWidth: 24,
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                
                {/* Down arrow - hidden for last patient */}
                {!isLast && onMoveDown && (
                    <Tooltip title="Nach unten verschieben" arrow placement="top">
                        <IconButton
                            size="small"
                            onClick={handleMoveDown}
                            sx={{ 
                                color: 'text.secondary',
                                width: 24,
                                height: 24,
                                minWidth: 24,
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                
                {/* Separator line when at least one arrow is visible and not first/last */}
                {((onMoveUp && !isFirst) || (onMoveDown && !isLast)) && (
                    <Divider orientation="vertical" flexItem sx={{ height: 16, my: 'auto' }} />
                )}
                
                {/* Assign button that opens area menu */}
                <Tooltip title="Bereich zuweisen" arrow placement="top">
                    <IconButton
                        size="small"
                        onClick={handleAreaMenuOpen}
                        aria-label="Bereich zuweisen"
                        sx={{ 
                            color: 'text.secondary',
                            width: 24,
                            height: 24,
                            minWidth: 24,
                            '&:hover': {
                                backgroundColor: 'transparent',
                                color: 'primary.main'
                            }
                        }}
                    >
                        <SwapHorizIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

            </Box>
            
            {/* Area assignment menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleAreaMenuClose}
                sx={{
                    '& .MuiPaper-root': {
                        maxHeight: 300,
                        overflow: 'auto',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        borderRadius: 2
                    }
                }}
            >
                {weekendAreas.map((targetArea) => {
                    const isCurrentArea = targetArea === area;
                    const disabled = isCurrentArea;
                    const areaColor = getAreaColor(targetArea);
                    
                    return (
                        <MenuItem 
                            key={targetArea}
                            onClick={() => !disabled && handleMoveToArea(targetArea)}
                            disabled={disabled}
                            sx={{
                                backgroundColor: disabled ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                                opacity: disabled ? 0.7 : 1,
                                py: 1,
                                '&:hover': {
                                    backgroundColor: disabled ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.04)'
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
                                            opacity: disabled ? 0.7 : 1,
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

            
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start'
                }}>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            {index !== undefined && (
                                <Box sx={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    mr: 1,
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    {index}
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography 
                                    variant="h6" 
                                    component="div" 
                                    fontWeight="bold"
                                    sx={{ 
                                        lineHeight: 1.2,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {patient.last_name}, {patient.first_name}
                                </Typography>
                                <Chip
                                    label={visitChipStyles.label}
                                    size="small"
                                    sx={{
                                        bgcolor: visitChipStyles.bgcolor,
                                        color: '#fff',
                                        fontWeight: 600
                                    }}
                                />
                            </Box>
                        </Box>
                        
                        
                        {/* Adresse immer mit Haussymbol anzeigen */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <HomeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {patient.street}, {patient.zip_code} {patient.city}
                            </Typography>
                        </Box>
                        
                        {patient.phone1 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {patient.phone1}
                                </Typography>
                            </Box>
                        )}
                        
                        {/* Info für den ausgewählten Tag anzeigen */}
                        {selectedDayAppointment?.info && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {selectedDayAppointment.info}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};
