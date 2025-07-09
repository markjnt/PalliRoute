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
import { useImportEmployees } from '../../services/queries/useEmployees';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface EmployeeImportProps {
    open: boolean;
    onClose: () => void;
}

export const EmployeeImport: React.FC<EmployeeImportProps> = ({
    open,
    onClose,
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const importEmployeesMutation = useImportEmployees();
    const { setNotification } = useNotificationStore();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel') {
                setSelectedFile(file);
                setFileError(null);
            } else {
                setFileError('Bitte wählen Sie eine Excel-Datei aus (.xlsx oder .xls)');
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setFileError('Bitte wählen Sie zuerst eine Datei aus');
            return;
        }

        try {
            const result = await importEmployeesMutation.mutateAsync(selectedFile);
            const totalEmployees = result.added_employees.length;
            setNotification(`${totalEmployees} Mitarbeiter wurden erfolgreich importiert.`, 'success');
            
            // Reset form state
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            setTimeout(onClose, 1500);
        } catch (error: any) {
            console.error('Error importing employees:', error);
            let message = 'Fehler beim Importieren der Mitarbeiter';
            if (error?.response?.data?.error) {
                message = error.response.data.error;
            } else if (error?.message) {
                message = error.message;
            }
            setNotification(message, 'error');
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
            onClose={!importEmployeesMutation.isPending ? handleClose : undefined}
            maxWidth="sm" 
            fullWidth
        >
            <DialogTitle>Mitarbeiter aus Excel importieren</DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <AlertTitle>Achtung!</AlertTitle>
                        Beim Import werden alle bestehenden Daten (Mitarbeiter, Patienten, Termine und Routen) gelöscht!
                    </Alert>

                    <Typography variant="body1" gutterBottom>
                        Bitte wählen Sie eine Excel-Datei mit den folgenden Spalten:
                    </Typography>
                    <Typography component="div" variant="body2" sx={{ pl: 2, mb: 3 }}>
                        • Vorname
                        <br />
                        • Nachname
                        <br />
                        • Strasse
                        <br />
                        • PLZ
                        <br />
                        • Ort
                        <br />
                        • Funktion (Pflegekraft, Arzt, Physiotherapie, Honorararzt, PDL)
                        <br />
                        • Stellenumfang (0-100)
                        <br />
                        • Gebiet (Nordkreis, Südkreis)
                    </Typography>

                    {importEmployeesMutation.isPending ? (
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
                </Box>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleClose} 
                    disabled={importEmployeesMutation.isPending}
                >
                    Abbrechen
                </Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    color="primary"
                    disabled={!selectedFile || importEmployeesMutation.isPending}
                >
                    {importEmployeesMutation.isPending ? 'Importiere...' : 'Importieren'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 