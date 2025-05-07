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
    Upload as UploadIcon,
    Event as CalendarIcon,
    Route as RouteIcon
} from '@mui/icons-material';
import { Weekday } from '../../types/models';
import { ToursView } from './ToursView';
import { PatientExcelImport } from './PatientImport';
import { useWeekdayStore } from '../../stores';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients, usePatientImport } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes, useOptimizeRoutes } from '../../services/queries/useRoutes';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useQueryClient } from '@tanstack/react-query';

interface TourPlanSidebarProps {
    width?: number;
}

export const TourPlanSidebar: React.FC<TourPlanSidebarProps> = ({
    width = 400
}) => {
    const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
    const [calendarWeek, setCalendarWeek] = useState<number | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    const { notification, setNotification, closeNotification } = useNotificationStore();
    const queryClient = useQueryClient();

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
        error: routesError,
        refetch
    } = useRoutes({ weekday: selectedWeekday });
    
    const patientImportMutation = usePatientImport();
    const optimizeRoutesMutation = useOptimizeRoutes();

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
        setNotification('Import erfolgreich abgeschlossen.', 'success');
    }, [handleImportDialogClose, setNotification]);

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

    const handleOptimizeAllRoutes = async () => {
        if (!employees.length) return;
        
        setIsOptimizing(true);
        try {
            const optimizationPromises = employees
                .filter(employee => employee.id !== undefined)
                .map(employee => 
                    optimizeRoutesMutation.mutateAsync({
                        date: selectedWeekday.toLowerCase(),
                        employeeId: employee.id as number
                    })
                );
            
            await Promise.all(optimizationPromises);
            
            // Invalidate routes query to trigger a refetch
            await queryClient.invalidateQueries({ queryKey: ['routes'] });
            setNotification('Alle Routen wurden erfolgreich optimiert', 'success');
        } catch (error) {
            setNotification('Fehler beim Optimieren der Routen', 'error');
        } finally {
            setIsOptimizing(false);
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

            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                    variant="contained"
                    fullWidth
                    startIcon={<UploadIcon />}
                    onClick={handleImportDialogOpen}
                >
                    Excel Import
                </Button>
                <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<RouteIcon />}
                    onClick={handleOptimizeAllRoutes}
                    disabled={isOptimizing || !employees.length}
                >
                    {isOptimizing ? 'Optimierung läuft...' : 'Alle Routen optimieren'}
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
        </Box>
    );
}; 