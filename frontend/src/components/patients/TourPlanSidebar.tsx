import React, { useState, useEffect, useCallback } from 'react';
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
import { Patient, Appointment, Weekday, Employee } from '../../types/models';
import { ToursView } from './ToursView';
import { PatientExcelImport } from './PatientExcelImport';
import { patientsApi, employeesApi, appointmentsApi } from '../../services/api';
import { useWeekday } from '../../contexts/WeekdayContext';

interface TourPlanSidebarProps {
    width?: number;
}

export const TourPlanSidebar: React.FC<TourPlanSidebarProps> = ({
    width = 400
}) => {
    const { selectedWeekday, setSelectedWeekday } = useWeekday();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
    const [calendarWeek, setCalendarWeek] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingDayAppointments, setLoadingDayAppointments] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Lade alle Patienten
            const patients = await patientsApi.getAll();
            setPatients(patients);
            
            // Bestimme die Kalenderwoche aus den Patientendaten
            let extractedCalendarWeek: number | null = null;
            
            // Finde die erste nicht-null Kalenderwoche
            for (const patient of patients) {
                if (patient.calendar_week) {
                    extractedCalendarWeek = patient.calendar_week;
                    break;
                }
            }
            
            setCalendarWeek(extractedCalendarWeek);
            
            // Initial loading of appointments for the selected day
            fetchAppointmentsByWeekday(selectedWeekday);
        } catch (error) {
            console.error('Error fetching patients:', error);
            setError('Fehler beim Laden der Patienten.');
        } finally {
            setLoading(false);
        }
    }, [selectedWeekday]);

    useEffect(() => {
        fetchPatients();
        fetchEmployees();
    }, [fetchPatients]);

    // Fetch appointments for the selected day when the day changes
    useEffect(() => {
        fetchAppointmentsByWeekday(selectedWeekday);
    }, [selectedWeekday, fetchPatients]);

    const fetchAppointmentsByWeekday = async (day: Weekday) => {
        setLoadingDayAppointments(true);
        try {            
            const response = await appointmentsApi.getByWeekday(day);
            
            if (response && response.length > 0) {
                setDayAppointments(response);
            } else {
                console.log(`No appointments found from API for ${day}, falling back to client filtering`);
                // Fallback: Wenn keine Termine vom API kommen, versuchen wir
                // vorhandene Termine client-seitig zu filtern
                const allAppointments = await appointmentsApi.getAll();
                if (allAppointments) {
                    // Direkte Filterung ohne Normalisierung
                    const filteredAppointments = allAppointments.filter(a => a.weekday === day);
                    setDayAppointments(filteredAppointments);
                }
            }
        } catch (error) {
            console.error("Error fetching appointments:", error);
            // Bei Fehlern versuchen wir, die vorhandenen Termine zu filtern
            try {
                const allAppointments = await appointmentsApi.getAll();
                if (allAppointments) {
                    // Direkte Filterung ohne Normalisierung
                    const filteredAppointments = allAppointments.filter(a => a.weekday === day);
                    console.log(`Found ${filteredAppointments.length} appointments by client filtering after API error`);
                    setDayAppointments(filteredAppointments);
                }
            } catch (fallbackError) {
                console.error("Fallback error fetching all appointments:", fallbackError);
            }
        } finally {
            setLoadingDayAppointments(false);
        }
    };

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const activeEmployees = await employeesApi.getAll();
            // Filter to only include active employees
            setEmployees(activeEmployees.filter(emp => emp.is_active));
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoadingEmployees(false);
        }
    };

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
        
        // Refresh all data
        fetchPatients();
        fetchEmployees();
        
        // Refresh appointments for the selected day which will also update routes
        fetchAppointmentsByWeekday(selectedWeekday);
        
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
                    selectedDay={selectedWeekday}
                    loading={loading || loadingEmployees || loadingDayAppointments}
                    error={error}
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