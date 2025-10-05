import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    Chip,
    Avatar,
    CircularProgress
} from '@mui/material';
import { Employee } from '../../types/models';
import { getColorForTour } from '../../utils/colors';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface ReplacementConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    sourceEmployee: Employee; // Original employee (whose appointments these are)
    currentEmployee: Employee; // Who currently has the appointments
    targetEmployee: Employee | null; // Who will get the appointments
    weekday: string;
    patientCount: number;
    targetPatientCount: number;
    isRemovingReplacement: boolean;
}

export const ReplacementConfirmationDialog: React.FC<ReplacementConfirmationDialogProps> = ({
    open,
    onClose,
    onConfirm,
    sourceEmployee,
    currentEmployee,
    targetEmployee,
    weekday,
    patientCount,
    targetPatientCount,
    isRemovingReplacement
}) => {
    const [isMoving, setIsMoving] = useState(false);
    const { setNotification } = useNotificationStore();

    const handleConfirm = async () => {
        setIsMoving(true);
        try {
            // Just call the onConfirm callback - the parent component will handle the replacement update
            // which will automatically move appointments in the backend
            onConfirm();
        } catch (error) {
            console.error('Error confirming replacement:', error);
            setNotification(
                'Fehler beim Bestätigen der Vertretung. Bitte versuchen Sie es erneut.',
                'error'
            );
        } finally {
            setIsMoving(false);
        }
    };

    const getActionText = () => {
        if (isRemovingReplacement) {
            return `Vertretung für ${sourceEmployee.first_name} ${sourceEmployee.last_name} entfernen?`;
        }
        return `Vertretung für ${sourceEmployee.first_name} ${sourceEmployee.last_name} einstellen?`;
    };

    const getWarningText = () => {
        if (targetPatientCount > 0) {
            return `Warnung: ${targetEmployee?.first_name} ${targetEmployee?.last_name} hat bereits ${targetPatientCount} ${targetPatientCount === 1 ? 'Patient' : 'Patienten'} am ${weekday}.`;
        }
        return null;
    };

    const hasWarning = targetPatientCount > 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle sx={{ p: 0, pb: 2 }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 2,
                    backgroundColor: getColorForTour(sourceEmployee.id) + '50'
                }}>
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: getColorForTour(sourceEmployee.id),
                            fontSize: '0.875rem'
                        }}
                    >
                        {`${sourceEmployee.first_name[0]}${sourceEmployee.last_name[0]}`.toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="medium">
                            {isRemovingReplacement ? 'Vertretung entfernen' : 'Vertretung einstellen'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            für {sourceEmployee.first_name} {sourceEmployee.last_name}
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            
            <DialogContent>

                {/* Employee Movement */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: getColorForTour(currentEmployee.id),
                                fontSize: '0.875rem'
                            }}
                        >
                            {`${currentEmployee.first_name[0]}${currentEmployee.last_name[0]}`.toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight="medium">
                                {currentEmployee.first_name} {currentEmployee.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {currentEmployee.function}
                            </Typography>
                        </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                        →
                    </Typography>
                    
                    {targetEmployee && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: getColorForTour(targetEmployee.id),
                                    fontSize: '0.875rem'
                                }}
                            >
                                {`${targetEmployee.first_name[0]}${targetEmployee.last_name[0]}`.toUpperCase()}
                            </Avatar>
                            <Box>
                                <Typography variant="body2" fontWeight="medium">
                                    {targetEmployee.first_name} {targetEmployee.last_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {targetEmployee.function}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Patient Count Info */}
                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={`${patientCount} ${patientCount === 1 ? 'Patient' : 'Patienten'} verschieben`}
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                    />
                    {targetPatientCount > 0 && (
                        <Chip
                            label={`${targetPatientCount} ${targetPatientCount === 1 ? 'Patient' : 'Patienten'} bereits vorhanden`}
                            color="warning"
                            variant="outlined"
                        />
                    )}
                </Box>

                {/* Warning */}
                {hasWarning && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {getWarningText()}
                    </Alert>
                )}

            </DialogContent>

            <DialogActions>
                <Button 
                    onClick={onClose}
                    disabled={isMoving}
                >
                    Abbrechen
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color={hasWarning ? "warning" : "primary"}
                    disabled={isMoving || !targetEmployee}
                    startIcon={isMoving ? <CircularProgress size={16} /> : null}
                >
                    {isMoving ? 'Verschiebe...' : 'Bestätigen'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
