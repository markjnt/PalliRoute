import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import {
    Today as TodayIcon,
    Upload as UploadIcon,
    Event as CalendarIcon,
    Route as RouteIcon,
    DeleteForever as DeleteForeverIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
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
import { useRouteVisibility } from '../../stores/useRouteVisibilityStore';

interface TourPlanSidebarProps {
    width?: number;
}

export const TourPlanSidebar: React.FC<TourPlanSidebarProps> = ({
}) => {
    const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    const { notification, setNotification, closeNotification } = useNotificationStore();
    const queryClient = useQueryClient();
    const { hiddenPolylines, hideAllPolylines, showAllPolylines, showAllMarkers } = useRouteVisibility();

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
    } = useRoutes({ weekday: selectedWeekday });
    
    const patientImportMutation = usePatientImport();
    const optimizeRoutesMutation = useOptimizeRoutes();

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

    const handleOptimizeAllRoutes = async () => {
        if (!employees.length || !routes.length) return;

        // Nur Mitarbeiter, die eine Route für den Tag haben
        const employeeIdsWithRoute = routes
            .filter(route => route.employee_id !== undefined && route.employee_id !== null)
            .map(route => route.employee_id);

        const employeesWithRoute = employees.filter(
            emp => emp.id !== undefined && employeeIdsWithRoute.includes(emp.id)
        );

        setIsOptimizing(true);
        try {
            const optimizationPromises = employeesWithRoute.map(employee =>
                optimizeRoutesMutation.mutateAsync({
                    weekday: selectedWeekday.toLowerCase(),
                    employeeId: employee.id as number
                })
            );

            await Promise.all(optimizationPromises);
            await queryClient.invalidateQueries();

            setNotification('Alle Routen für den Tag wurden erfolgreich optimiert', 'success');
        } catch (error) {
            setNotification('Fehler beim Optimieren der Routen', 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    // Check if there's any data
    const hasData = patients.length > 0 || dayAppointments.length > 0 || routes.length > 0;

    // Toggle all polylines visibility
    const allRouteIds = useMemo(() => routes.map(r => r.id), [routes]);
    const allHidden = allRouteIds.length > 0 && allRouteIds.every(id => hiddenPolylines.has(id));
    const allVisible = allRouteIds.length > 0 && allRouteIds.every(id => !hiddenPolylines.has(id));
    const handleToggleAllPolylines = () => {
      if (!allRouteIds.length) return;
      if (!allVisible) {
        showAllPolylines();
        showAllMarkers(); // Marker auch zurücksetzen!
      } else {
        hideAllPolylines(allRouteIds);
        // Marker NICHT beeinflussen!
      }
    };

    useEffect(() => {
        showAllPolylines();
    }, [selectedWeekday, showAllPolylines]);

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
                    {patients[0]?.calendar_week && (
                        <Chip
                            icon={<CalendarIcon fontSize="small" />}
                            label={`KW ${patients[0].calendar_week}`}
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
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<UploadIcon />}
                        onClick={handleImportDialogOpen}
                        disabled={!employees.length}
                    >
                        Excel Import
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<RouteIcon />}
                        onClick={handleOptimizeAllRoutes}
                        disabled={isOptimizing || !routes.length}
                    >
                        {isOptimizing ? 'Optimierung läuft...' : 'Alle Routen optimieren'}
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={!allVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        onClick={handleToggleAllPolylines}
                        disabled={!routes.length}
                    >
                        {!allVisible ? 'Alle Routen einblenden' : 'Alle Routen ausblenden'}
                    </Button>
                </Box>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <ToursView selectedDay={selectedWeekday} />
            </Box>

            <PatientExcelImport
                open={importDialogOpen}
                onClose={handleImportDialogClose}
                onSuccess={handleImportSuccess}
            />
        </Box>
    );
}; 