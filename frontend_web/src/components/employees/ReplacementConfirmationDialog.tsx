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
import { useMoveAllPatients } from '../../services/queries/useEmployeePlanning';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface ReplacementConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    sourceEmployee: Employee;
    targetEmployee: Employee | null;
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
    targetEmployee,
    weekday,
    patientCount,
    targetPatientCount,
    isRemovingReplacement
}) => {
    const [isMoving, setIsMoving] = useState(false);
    const moveAllMutation = useMoveAllPatients();
    const { setNotification } = useNotificationStore();

    const handleConfirm = async () => {
        if (!targetEmployee) return;
        
        setIsMoving(true);
        try {
            await moveAllMutation.mutateAsync({
                sourceEmployeeId: sourceEmployee.id || 0,
                targetEmployeeId: targetEmployee.id || 0,
                weekday: weekday.toLowerCase()
            });
            
            // Show success notification
            if (isRemovingReplacement) {
                setNotification(
                    `${patientCount} ${patientCount === 1 ? 'Patient' : 'Patienten'} erfolgreich zurück zu ${targetEmployee.first_name} ${targetEmployee.last_name} verschoben`,
                    'success'
                );
            } else {
                setNotification(
                    `${patientCount} ${patientCount === 1 ? 'Patient' : 'Patienten'} erfolgreich zu ${targetEmployee.first_name} ${targetEmployee.last_name} verschoben`,
                    'success'
                );
            }
            
            onConfirm();
        } catch (error) {
            console.error('Error moving patients:', error);
            setNotification(
                'Fehler beim Verschieben der Patienten. Bitte versuchen Sie es erneut.',
                'error'
            );
        } finally {
            setIsMoving(false);
        }
    };

    const getActionText = () => {
        if (isRemovingReplacement) {
            return `Alle Patienten von ${sourceEmployee.first_name} ${sourceEmployee.last_name} zurück zu ${targetEmployee?.first_name} ${targetEmployee?.last_name} verschieben`;
        }
        return `Alle Patienten von ${sourceEmployee.first_name} ${sourceEmployee.last_name} zu ${targetEmployee?.first_name} ${targetEmployee?.last_name} verschieben`;
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
            <DialogTitle>
                Vertretung {isRemovingReplacement ? 'entfernen' : 'einstellen'}
            </DialogTitle>
            
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        {getActionText()}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {patientCount} {patientCount === 1 ? 'Patient' : 'Patienten'} werden am {weekday} verschoben.
                    </Typography>
                </Box>

                {/* Employee Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <Typography variant="body2" fontWeight="medium">
                                {sourceEmployee.first_name} {sourceEmployee.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {sourceEmployee.function}
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
