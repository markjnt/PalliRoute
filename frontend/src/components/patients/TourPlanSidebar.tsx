import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Divider,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
    Chip,
    Snackbar,
    Alert
} from '@mui/material';
import {
    Today as TodayIcon,
    CloudUpload as UploadIcon,
    Event as CalendarIcon
} from '@mui/icons-material';
import { Weekday } from '../../types/models';
import { ToursView } from './ToursView';
import { PatientExcelImport } from './PatientExcelImport';
import { useWeekdayStore } from '../../stores';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients, usePatientImport } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';

interface TourPlanSidebarProps {
    width?: number;
}

export const TourPlanSidebar: React.FC<TourPlanSidebarProps> = ({
    width = 400
}) => {
    const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
    const [calendarWeek, setCalendarWeek] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // React Query Hooks
    const { 
        data: employees = [], 
        isLoading: loadingEmployees 
    } = useEmployees();
    
    const {
        data: patients = [],
        isLoading: loadingPatients,
        error: patientsError
    } = usePatients();
    
    const {
        data: dayAppointments = [],
        isLoading: loadingAppointments,
        error: appointmentsError
    } = useAppointmentsByWeekday(selectedWeekday);
    
    // Add the routes query hook
    const {
        data: routes = [],
        isLoading: loadingRoutes,
        error: routesError
    } = useRoutes({ weekday: selectedWeekday });
    
    const patientImportMutation = usePatientImport();

    // Setze die Kalenderwoche basierend auf den Patientendaten
    useEffect(() => {
        if (patients && patients.length > 0) {
            // Finde die erste nicht-null Kalenderwoche
            for (const patient of patients) {
                if (patient.calendar_week) {
                    setCalendarWeek(patient.calendar_week);
                    break;
                }
            }
        }
    }, [patients]);

    const handleDayChange = (event: SelectChangeEvent) => {
        setSelectedWeekday(event.target.value as Weekday);
    };

    const handleImportDialogOpen = () => {
        setImportDialogOpen(true);
    };

    const handleImportDialogClose = () => {
        setImportDialogOpen(false);
    };

    const handleImportSuccess = (response: any) => {
        // Set the calendar week from the import response
        if (response.calendar_week) {
            setCalendarWeek(response.calendar_week);
        }
        
        // Close the dialog
        handleImportDialogClose();
        
        // Show success notification
        setSuccessMessage(`Import erfolgreich abgeschlossen.`);
    };

    // Handler zum Schließen der Erfolgsbenachrichtigung
    const handleCloseSuccessMessage = () => {
        setSuccessMessage(null);
    };

    const getWeekdayName = (day: Weekday): string => {
        switch (day) {
            case 'monday': return 'Montag';
            case 'tuesday': return 'Dienstag';
            case 'wednesday': return 'Mittwoch';
            case 'thursday': return 'Donnerstag';
            case 'friday': return 'Freitag';
            default: return 'Unbekannt';
        }
    };
    
    // Kombiniere alle Fehler und Lade-Status
    const isLoading = loadingPatients || loadingEmployees || loadingAppointments || loadingRoutes;
    const combinedError = patientsError instanceof Error 
        ? patientsError.message 
        : appointmentsError instanceof Error
            ? appointmentsError.message
            : routesError instanceof Error
                ? routesError.message
                : error;

    return (
        <Box
            sx={{
                height: '100%',
                width: '100%',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                height: 64,
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6" component="h2" sx={{ pl: 4.5 }}>
                        Tourenplanung
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {calendarWeek && (
                        <Chip
                            icon={<CalendarIcon fontSize="small" />}
                            label={`KW ${calendarWeek}`}
                            color="primary"
                            size="small"
                            variant="outlined"
                        />
                    )}
                    <FormControl sx={{ width: 145 }}>
                        <Select
                            value={selectedWeekday}
                            onChange={handleDayChange}
                            size="small"
                            displayEmpty
                            renderValue={(value) => (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TodayIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
                                    <span>{getWeekdayName(value as Weekday)}</span>
                                </Box>
                            )}
                        >
                            <MenuItem value="monday">Montag</MenuItem>
                            <MenuItem value="tuesday">Dienstag</MenuItem>
                            <MenuItem value="wednesday">Mittwoch</MenuItem>
                            <MenuItem value="thursday">Donnerstag</MenuItem>
                            <MenuItem value="friday">Freitag</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <Box sx={{ p: 2 }}>
                <Button
                    variant="contained"
                    fullWidth
                    startIcon={<UploadIcon />}
                    onClick={handleImportDialogOpen}
                >
                    Excel Import (Daten zurücksetzen)
                </Button>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <ToursView 
                    employees={employees}
                    patients={patients}
                    appointments={dayAppointments}
                    routes={routes}
                    selectedDay={selectedWeekday}
                    loading={isLoading}
                    error={combinedError}
                />
            </Box>

            <PatientExcelImport
                open={importDialogOpen}
                onClose={handleImportDialogClose}
                onSuccess={handleImportSuccess}
            />
            
            {/* Erfolgsbenachrichtigung */}
            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={handleCloseSuccessMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseSuccessMessage} 
                    severity="success" 
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {successMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}; 