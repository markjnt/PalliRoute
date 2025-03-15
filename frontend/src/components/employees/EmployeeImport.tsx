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
import { employeesApi } from '../../services/api/employees';

interface EmployeeImportProps {
    open: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

export const EmployeeImport: React.FC<EmployeeImportProps> = ({
    open,
    onClose,
    onImportSuccess,
}) => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel') {
                setSelectedFile(file);
                setError(null);
            } else {
                setError('Bitte wählen Sie eine Excel-Datei aus (.xlsx oder .xls)');
                setSelectedFile(null);
            }
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setError('Bitte wählen Sie zuerst eine Datei aus');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await employeesApi.import(selectedFile);
            onImportSuccess();
            onClose();
            if (result.message.includes('übersprungen')) {
                console.log(result.message);
            }
        } catch (error: any) {
            console.error('Error importing employees:', error);
            const errorMessage = error.response?.data?.error || 'Fehler beim Importieren der Mitarbeiter. Bitte überprüfen Sie das Dateiformat und versuchen Sie es erneut.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Mitarbeiter aus Excel importieren</DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
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

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Abbrechen
                </Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    color="primary"
                    disabled={!selectedFile || loading}
                    startIcon={loading ? <CircularProgress size={20} /> : undefined}
                >
                    {loading ? 'Importiere...' : 'Importieren'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 