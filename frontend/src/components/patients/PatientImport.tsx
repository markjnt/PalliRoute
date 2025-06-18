import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
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
                <Box sx={{ p: 2 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <AlertTitle>Achtung!</AlertTitle>
                        Beim Import werden alle bestehenden Patienten und Termine aus der Datenbank 
                        gelöscht und durch die neu importierten Daten ersetzt!
                    </Alert>

                    <Typography variant="body1" gutterBottom>
                        Bitte wählen Sie eine Excel-Datei mit den folgenden Spalten:
                    </Typography>
                    <Typography component="div" variant="body2" sx={{ pl: 2, mb: 3 }}>
                        • Gebiet
                        <br />
                        • Touren
                        <br />
                        • Nachname
                        <br />
                        • Vorname
                        <br />
                        • Ort
                        <br />
                        • PLZ
                        <br />
                        • Strasse
                        <br />
                        • KW
                        <br />
                        • Montag, Uhrzeit/Info Montag
                        <br />
                        • Dienstag, Uhrzeit/Info Dienstag
                        <br />
                        • Mittwoch, Uhrzeit/Info Mittwoch
                        <br />
                        • Donnerstag, Uhrzeit/Info Donnerstag
                        <br />
                        • Freitag, Uhrzeit/Info Freitag
                    </Typography>

                    {patientImportMutation.isPending ? (
                        <Box sx={{ width: '100%', textAlign: 'center', py: 3 }}>
                            <Typography variant="body2" gutterBottom>
                                Datei wird hochgeladen und verarbeitet...
                            </Typography>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', my: 3 }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                            />
                            <Button
                                variant="outlined"
                                onClick={() => fileInputRef.current?.click()}
                                startIcon={<UploadIcon />}
                            >
                                Excel-Datei auswählen
                            </Button>
                            
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

                    {fileError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            <AlertTitle>Fehler</AlertTitle>
                            {fileError}
                        </Alert>
                    )}
                    
                    {patientImportMutation.error instanceof Error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            <AlertTitle>Fehler</AlertTitle>
                            {patientImportMutation.error.message}
                        </Alert>
                    )}
                </Box>
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
                >
                    {patientImportMutation.isPending ? 'Importiere...' : 'Importieren'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 