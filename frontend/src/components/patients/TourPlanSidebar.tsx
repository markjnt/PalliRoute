import React, { useState, useCallback, useMemo } from 'react';
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
    
    const {
        data: routes = [],
        isLoading: loadingRoutes,
        error: routesError
    } = useRoutes({ weekday: selectedWeekday });
    
    const patientImportMutation = usePatientImport();

    // Memoize calendar week calculation
    const calculateCalendarWeek = useCallback(() => {
        if (patients && patients.length > 0) {
            const patientWithWeek = patients.find(p => p.calendar_week);
            if (patientWithWeek?.calendar_week) {
                setCalendarWeek(patientWithWeek.calendar_week);
            }
        }
    }, [patients]);

    // Handle weekday change
    const handleDayChange = useCallback((event: SelectChangeEvent) => {
        setSelectedWeekday(event.target.value as Weekday);
    }, [setSelectedWeekday]);

    // Import dialog handlers
    const handleImportDialogOpen = useCallback(() => {
        setImportDialogOpen(true);
    }, []);

    const handleImportDialogClose = useCallback(() => {
        setImportDialogOpen(false);
    }, []);

    const handleImportSuccess = useCallback((response: any) => {
        if (response.calendar_week) {
            setCalendarWeek(response.calendar_week);
        }
        handleImportDialogClose();
        setSuccessMessage(`Import erfolgreich abgeschlossen.`);
    }, [handleImportDialogClose]);

    const handleCloseSuccessMessage = useCallback(() => {
        setSuccessMessage(null);
    }, []);

    // Memoize weekday name mapping
    const getWeekdayName = useCallback((day: Weekday): string => {
        const weekdayNames: Record<Weekday, string> = {
            monday: 'Montag',
            tuesday: 'Dienstag',
            wednesday: 'Mittwoch',
            thursday: 'Donnerstag',
            friday: 'Freitag'
        };
        return weekdayNames[day] || 'Unbekannt';
    }, []);
    
    // Memoize loading and error states
    const isLoading = useMemo(() => 
        loadingPatients || loadingEmployees || loadingAppointments || loadingRoutes,
        [loadingPatients, loadingEmployees, loadingAppointments, loadingRoutes]
    );

    const error = useMemo(() => {
        if (patientsError instanceof Error) return patientsError.message;
        if (appointmentsError instanceof Error) return appointmentsError.message;
        if (routesError instanceof Error) return routesError.message;
        return null;
    }, [patientsError, appointmentsError, routesError]);

    // Memoize ToursView props
    const toursViewProps = useMemo(() => ({
        employees,
        patients,
        appointments: dayAppointments,
        routes,
        selectedDay: selectedWeekday,
        loading: isLoading,
        error
    }), [employees, patients, dayAppointments, routes, selectedWeekday, isLoading, error]);

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
                <ToursView {...toursViewProps} />
            </Box>

            <PatientExcelImport
                open={importDialogOpen}
                onClose={handleImportDialogClose}
                onSuccess={handleImportSuccess}
            />
            
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