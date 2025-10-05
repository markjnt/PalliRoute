import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Alert
} from '@mui/material';
import { 
    Person as PersonIcon,
    SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { getColorForTour } from '../../utils/colors';

// Helper function to translate weekdays to German
const translateWeekday = (weekday: string): string => {
    const weekdayMap: { [key: string]: string } = {
        'monday': 'Montag',
        'tuesday': 'Dienstag',
        'wednesday': 'Mittwoch',
        'thursday': 'Donnerstag',
        'friday': 'Freitag',
        'saturday': 'Samstag',
        'sunday': 'Sonntag'
    };
    return weekdayMap[weekday.toLowerCase()] || weekday;
};

interface ReplacementConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (respectReplacement: boolean) => void;
    sourceEmployee: Employee;
    targetEmployee: Employee;
    replacementEmployee?: Employee;
    patientName: string;
    weekday: string;
}

export const ReplacementConfirmationDialog: React.FC<ReplacementConfirmationDialogProps> = ({
    open,
    onClose,
    onConfirm,
    sourceEmployee,
    targetEmployee,
    replacementEmployee,
    patientName,
    weekday
}) => {
    const handleRespectReplacement = () => {
        onConfirm(true);
        onClose();
    };

    const handleIgnoreReplacement = () => {
        onConfirm(false);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SwapHorizIcon color="primary" />
                    <Typography variant="h6" component="div">
                        Vertretung berücksichtigen?
                    </Typography>
                </Box>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Sie möchten den Termin für <strong>{patientName}</strong> am <strong>{translateWeekday(weekday)}</strong> verschieben:
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="action" />
                        <Chip
                            label={`${sourceEmployee.first_name} ${sourceEmployee.last_name}`}
                            size="small"
                            sx={{
                                bgcolor: getColorForTour(sourceEmployee.id || 0),
                                color: 'white',
                                '& .MuiChip-label': {
                                    px: 1.5,
                                    fontSize: '0.875rem'
                                }
                            }}
                        />
                    </Box>
                    
                    <SwapHorizIcon color="action" />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="action" />
                        <Chip
                            label={`${targetEmployee.first_name} ${targetEmployee.last_name}`}
                            size="small"
                            sx={{
                                bgcolor: getColorForTour(targetEmployee.id || 0),
                                color: 'white',
                                '& .MuiChip-label': {
                                    px: 1.5,
                                    fontSize: '0.875rem'
                                }
                            }}
                        />
                    </Box>
                </Box>

                {replacementEmployee && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>{targetEmployee.first_name} {targetEmployee.last_name}</strong> hat eine Vertretung:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <PersonIcon fontSize="small" />
                            <Chip
                                label={`${replacementEmployee.first_name} ${replacementEmployee.last_name}`}
                                size="small"
                                color="info"
                                sx={{
                                    '& .MuiChip-label': {
                                        px: 1,
                                        fontSize: '0.75rem'
                                    }
                                }}
                            />
                        </Box>
                    </Alert>
                )}

                <Typography variant="body2" color="text.secondary">
                    Möchten Sie die Vertretung berücksichtigen oder den Termin direkt dem ursprünglich gewählten Mitarbeiter zuweisen?
                </Typography>
            </DialogContent>
            
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                <Button 
                    onClick={onClose}
                    variant="outlined"
                    sx={{ textTransform: 'none' }}
                >
                    Abbrechen
                </Button>
                
                <Button 
                    onClick={handleIgnoreReplacement}
                    variant="outlined"
                    color="warning"
                    sx={{ textTransform: 'none' }}
                >
                    Direkt zuweisen
                </Button>
                
                <Button 
                    onClick={handleRespectReplacement}
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                >
                    Vertretung berücksichtigen
                </Button>
            </DialogActions>
        </Dialog>
    );
};
