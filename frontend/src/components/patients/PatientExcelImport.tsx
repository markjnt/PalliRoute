import React, { useState } from 'react';
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
    LinearProgress,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { PatientImportResponse } from '../../types/models';
import { patientsApi } from '../../services/api';
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
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            // Check if it's an Excel file
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setError(null);
            } else {
                setSelectedFile(null);
                setError('Bitte wählen Sie eine Excel-Datei (.xlsx oder .xls) aus.');
            }
        }
    };
    
    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Bitte wählen Sie eine Datei aus.');
            return;
        }
        
        setIsUploading(true);
        setError(null);
        
        try {
            const response = await patientsApi.import(selectedFile);
            
            setIsUploading(false);
            
            // Add calendar week to success message if available
            if (response.calendar_week) {
                response.message += ` (KW ${response.calendar_week})`;
            }
            
            onSuccess(response);
            handleClose();
        } catch (error) {
            setIsUploading(false);
            if (axios.isAxiosError(error) && error.response) {
                setError(error.response.data.error || 'Ein Fehler ist bei der Verarbeitung der Datei aufgetreten.');
            } else {
                setError('Ein unbekannter Fehler ist aufgetreten.');
            }
        }
    };
    
    const handleClose = () => {
        setSelectedFile(null);
        setError(null);
        setIsUploading(false);
        onClose();
    };
    
    return (
        <Dialog 
            open={open} 
            onClose={!isUploading ? handleClose : undefined}
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
                
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTitle>Fehler</AlertTitle>
                        {error}
                    </Alert>
                )}
                
                {isUploading ? (
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Datei wird hochgeladen und verarbeitet...
                        </Typography>
                        <LinearProgress />
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', my: 3 }}>
                        <input
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            id="raised-button-file"
                            multiple={false}
                            type="file"
                            onChange={handleFileChange}
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
                    disabled={isUploading}
                >
                    Abbrechen
                </Button>
                <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || isUploading}
                    variant="contained"
                    color="primary"
                >
                    Importieren
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 