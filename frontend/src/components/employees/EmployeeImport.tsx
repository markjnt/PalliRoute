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
            
            // Create success message
            const totalEmployees = result.added_employees.length + result.updated_employees.length;
            const successMsg = `Import erfolgreich: ${totalEmployees} Mitarbeiter verarbeitet (${result.added_employees.length} neu, ${result.updated_employees.length} aktualisiert)`;
            
            // Set success message using notification store
            setNotification(successMsg, 'success');
            
            // Reset form state
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Invalidate all relevant queries to refresh the data
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.invalidateQueries({ queryKey: ['patients'] });
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });
            await queryClient.invalidateQueries({ queryKey: ['routes'] });
            
            // Close the dialog after a short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error importing employees:', error);
            setNotification(error.message || 'Fehler beim Importieren der Mitarbeiter', 'error');
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Mitarbeiter aus Excel importieren</DialogTitle>
                <DialogContent>
                    <Box sx={{ p: 2 }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Achtung: Beim Import werden alle bestehenden Daten (Mitarbeiter, Patienten, Termine und Routen) gelöscht!
                        </Alert>
                        <Typography variant="body1" gutterBottom>
                            Bitte wählen Sie eine Excel-Datei mit den folgenden Spalten:
                        </Typography>
                        <Typography component="div" variant="body2" sx={{ pl: 2 }}>
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
                        </Typography>

                        <Box
                            sx={{
                                mt: 3,
                                p: 3,
                                border: '2px dashed #ccc',
                                borderRadius: 1,
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                },
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                            />
                            <UploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 1 }} />
                            <Typography>
                                {selectedFile
                                    ? `Ausgewählte Datei: ${selectedFile.name}`
                                    : 'Klicken Sie hier, um eine Excel-Datei auszuwählen'}
                            </Typography>
                        </Box>

                        {fileError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {fileError}
                            </Alert>
                        )}
                        
                        {importEmployeesMutation.error instanceof Error && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {importEmployeesMutation.error.message}
                            </Alert>
                        )}
                        
                        {importEmployeesMutation.isSuccess && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                Import erfolgreich!
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={importEmployeesMutation.isPending}>
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleImport}
                        variant="contained"
                        color="primary"
                        disabled={!selectedFile || importEmployeesMutation.isPending}
                        startIcon={importEmployeesMutation.isPending ? <CircularProgress size={20} /> : undefined}
                    >
                        {importEmployeesMutation.isPending ? 'Importiere...' : 'Importieren'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}; 