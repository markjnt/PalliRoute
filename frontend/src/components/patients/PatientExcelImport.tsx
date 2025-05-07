import React, { useState, useRef } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
    Box,
    Alert,
    AlertTitle,
    CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { PatientImportResponse } from '../../types/models';
import { usePatientImport } from '../../services/queries/usePatients';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '../../stores/useNotificationStore';
import axios from 'axios';

interface PatientExcelImportProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (response: PatientImportResponse) => void;
}

export const PatientExcelImport: React.FC<PatientExcelImportProps> = ({
    open,
    onClose,
    onSuccess
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const patientImportMutation = usePatientImport();
    const { setNotification } = useNotificationStore();
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
                file.type !== 'application/vnd.ms-excel') {
                setFileError('Bitte wählen Sie eine Excel-Datei aus (.xlsx oder .xls)');
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }
            setSelectedFile(file);
            setFileError(null);
        }
    };
    
    const handleImport = async () => {
        if (!selectedFile) {
            setFileError('Bitte wählen Sie zuerst eine Datei aus');
            return;
        }
        
        try {
            const result = await patientImportMutation.mutateAsync(selectedFile);
            
            // Add calendar week to success message if available
            if (result.calendar_week) {
                result.message += ` (KW ${result.calendar_week})`;
            }

            // Invalidate all relevant queries to refresh the data
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.invalidateQueries({ queryKey: ['patients'] });
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });
            await queryClient.invalidateQueries({ queryKey: ['routes'] });
            
            onSuccess(result);
            handleClose();
        } catch (error: any) {
            console.error('Error importing patients:', error);
            setNotification(error.message || 'Fehler beim Importieren der Patienten', 'error');
        }
    };
    
    const handleClose = () => {
        setSelectedFile(null);
        setFileError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };
    
    return (
        <Dialog 
            open={open} 
            onClose={!patientImportMutation.isPending ? handleClose : undefined}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>Patienten aus Excel importieren</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Laden Sie eine Excel-Datei hoch, um Patienten und deren Termine zu importieren. 
                    Die Datei sollte folgende Spalten enthalten: Gebiet, Touren, Nachname, Vorname, 
                    Ort, PLZ, Strasse, KW, Montag, Uhrzeit/Info Montag, usw.
                </DialogContentText>
                
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Achtung!</AlertTitle>
                    Beim Import werden alle bestehenden Patienten und Termine aus der Datenbank 
                    gelöscht und durch die neu importierten Daten ersetzt!
                </Alert>
                
                {fileError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTitle>Fehler</AlertTitle>
                        {fileError}
                    </Alert>
                )}
                
                {patientImportMutation.error instanceof Error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTitle>Fehler</AlertTitle>
                        {patientImportMutation.error.message}
                    </Alert>
                )}
                
                {patientImportMutation.isPending ? (
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Datei wird hochgeladen und verarbeitet...
                        </Typography>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', my: 3 }}>
                        <input
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            id="raised-button-file"
                            multiple={false}
                            type="file"
                            onChange={handleFileSelect}
                            ref={fileInputRef}
                        />
                        <label htmlFor="raised-button-file">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<UploadIcon />}
                            >
                                Excel-Datei auswählen
                            </Button>
                        </label>
                        
                        {selectedFile && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Ausgewählte Datei:
                                </Typography>
                                <Typography variant="body2">
                                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleClose} 
                    disabled={patientImportMutation.isPending}
                >
                    Abbrechen
                </Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    color="primary"
                    disabled={!selectedFile || patientImportMutation.isPending}
                    startIcon={patientImportMutation.isPending ? <CircularProgress size={20} /> : undefined}
                >
                    {patientImportMutation.isPending ? 'Importiere...' : 'Importieren'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 