import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Divider,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemText
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    CalendarMonth as CalendarIcon,
    Route as RouteIcon,
    DeleteForever as DeleteForeverIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Schedule as ScheduleIcon,
    ExpandMore as ExpandMoreIcon,
    RadioButtonChecked as RadioButtonCheckedIcon
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { Weekday } from '../../stores/useWeekdayStore';
import { ToursView } from './ToursView';
import { SearchField } from './SearchField';
import { useWeekdayStore } from '../../stores';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients, usePatientImport } from '../../services/queries/usePatients';
import { useLastPatientImportTime } from '../../services/queries/useConfig';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes, useOptimizeRoutes, useOptimizeWeekendRoutes } from '../../services/queries/useRoutes';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { useQueryClient } from '@tanstack/react-query';
import { useRouteVisibility } from '../../stores/useRouteVisibilityStore';

interface TourPlanSidebarProps {
    width?: number;
}

export const TourPlanSidebar: React.FC<TourPlanSidebarProps> = ({
}) => {
    const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [kwAnchorEl, setKwAnchorEl] = useState<null | HTMLElement>(null);
    const [filteredResults, setFilteredResults] = useState<{
        filteredActiveOtherEmployeesWithPatients: Employee[];
        filteredActiveOtherEmployeesWithoutPatients: Employee[];
        filteredDoctors: Employee[];
    }>({
        filteredActiveOtherEmployeesWithPatients: [],
        filteredActiveOtherEmployeesWithoutPatients: [],
        filteredDoctors: []
    });
    
    const { notification, setNotification, closeNotification } = useNotificationStore();
    const { lastPatientImportTime, setLastPatientImportTime } = useLastUpdateStore();
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
    const optimizeWeekendRoutesMutation = useOptimizeWeekendRoutes();
    const { data: lastImportTimeData } = useLastPatientImportTime();

    // Update local store when API data changes
    useEffect(() => {
        if (lastImportTimeData?.last_import_time) {
            setLastPatientImportTime(new Date(lastImportTimeData.last_import_time));
        }
    }, [lastImportTimeData, setLastPatientImportTime]);

    // Handle weekday change
    const handleDayChange = useCallback((newWeekday: Weekday) => {
        setSelectedWeekday(newWeekday);
        setAnchorEl(null);
    }, [setSelectedWeekday]);

    // Handle popover open/close
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    // Handle KW popover open/close
    const handleKwPopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setKwAnchorEl(event.currentTarget);
    };

    const handleKwPopoverClose = () => {
        setKwAnchorEl(null);
    };

    const handleImport = async () => {
        try {
            const result = await patientImportMutation.mutateAsync();
            setLastPatientImportTime(new Date());
            
            // Add calendar weeks to success message if available
            let message = result.message;
            if (result.calendar_weeks_str) {
                message += ` (KW ${result.calendar_weeks_str})`;
            } else if (result.calendar_week) {
                message += ` (KW ${result.calendar_week})`;
            }
            
            setNotification(message, 'success');
        } catch (error: any) {
            console.error('Error importing patients:', error);
            let message = 'Fehler beim Importieren der Patienten';
            if (error?.response?.data?.error) {
                message = error.response.data.error;
            } else if (error?.message) {
                message = error.message;
            }
            setNotification(message, 'error');
        }
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchTerm('');
    };

    // Memoize the filtered results change handler
    const handleFilteredResultsChange = useCallback((results: {
        filteredActiveOtherEmployeesWithPatients: Employee[];
        filteredActiveOtherEmployeesWithoutPatients: Employee[];
        filteredDoctors: Employee[];
    }) => {
        setFilteredResults(results);
    }, []);

    // Memoize weekday name mapping
    const getWeekdayName = useCallback((day: Weekday): string => {
        const weekdayNames: Record<Weekday, string> = {
            monday: 'Montag',
            tuesday: 'Dienstag',
            wednesday: 'Mittwoch',
            thursday: 'Donnerstag',
            friday: 'Freitag',
            saturday: 'Samstag',
            sunday: 'Sonntag'
        };
        return weekdayNames[day] || 'Unbekannt';
    }, []);

    // Get current calendar week (German/ISO 8601 standard)
    const getCurrentCalendarWeek = useCallback(() => {
        const now = new Date();
        
        // ISO 8601 week calculation - correct implementation
        const date = new Date(now.getTime());
        
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        const dayOfWeek = (date.getDay() + 6) % 7 + 1; // Monday = 1, Sunday = 7
        date.setDate(date.getDate() + 4 - dayOfWeek);
        
        // Get first day of year
        const yearStart = new Date(date.getFullYear(), 0, 1);
        
        // Calculate full weeks to nearest Thursday
        const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        
        return weekNumber;
    }, []);

    // Check if displayed KW matches current KW
    const isCurrentWeek = useMemo(() => {
        const currentWeek = getCurrentCalendarWeek();
        const displayedWeek = patients[0]?.calendar_week;
        return displayedWeek && displayedWeek === currentWeek;
    }, [patients, getCurrentCalendarWeek]);

    
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
        if (!routes.length) return;

        // Check if this is a weekend day
        const isWeekend = selectedWeekday === 'saturday' || selectedWeekday === 'sunday';

        setIsOptimizing(true);
        try {
            if (isWeekend) {
                // Optimize weekend routes by area
                const weekendAreas = ['Nord', 'Mitte', 'Süd'];
                const optimizationPromises = weekendAreas.map(area =>
                    optimizeWeekendRoutesMutation.mutateAsync({
                        weekday: selectedWeekday.toLowerCase(),
                        area: area
                    })
                );
                await Promise.all(optimizationPromises);
                setNotification('Alle Wochenend-Routen wurden erfolgreich optimiert', 'success');
            } else {
                // Optimize weekday routes by employee
                const employeeIdsWithRoute = routes
                    .filter(route => route.employee_id !== undefined && route.employee_id !== null)
                    .map(route => route.employee_id);

                const employeesWithRoute = employees.filter(
                    emp => emp.id !== undefined && employeeIdsWithRoute.includes(emp.id)
                );

                const optimizationPromises = employeesWithRoute.map(employee =>
                    optimizeRoutesMutation.mutateAsync({
                        weekday: selectedWeekday.toLowerCase(),
                        employeeId: employee.id as number
                    })
                );

                await Promise.all(optimizationPromises);
                setNotification('Alle Routen für den Tag wurden erfolgreich optimiert', 'success');
            }

            await queryClient.invalidateQueries();
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
                <Typography variant="h6" component="h2" sx={{ pl: 4.5 }}>
                    Tourenplanung
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Calendar Week Selector Button */}
                    {patients[0]?.calendar_week && (
                        <Button
                            variant="outlined"
                            onClick={handleKwPopoverOpen}
                            startIcon={<CalendarIcon />}
                            endIcon={<ExpandMoreIcon />}
                            sx={{
                                minWidth: 100,
                                justifyContent: 'space-between',
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: isCurrentWeek ? 'success.main' : 'primary.main',
                                color: isCurrentWeek ? 'success.main' : 'primary.main',
                                backgroundColor: isCurrentWeek ? 'success.50' : 'transparent',
                                '&:hover': {
                                    borderColor: isCurrentWeek ? 'success.dark' : 'primary.dark',
                                    backgroundColor: isCurrentWeek ? 'success.100' : 'primary.50',
                                }
                            }}
                        >
                            KW {patients[0].calendar_week}
                        </Button>
                    )}
                    
                    {/* Weekday Selector Button */}
                    <Button
                        variant="outlined"
                        onClick={handlePopoverOpen}
                        startIcon={<ScheduleIcon />}
                        endIcon={<ExpandMoreIcon />}
                        sx={{
                            minWidth: 140,
                            justifyContent: 'space-between',
                            textTransform: 'none',
                            fontWeight: 500,
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                                borderColor: 'primary.dark',
                                backgroundColor: 'primary.50',
                            }
                        }}
                    >
                        {getWeekdayName(selectedWeekday)}
                    </Button>
                </Box>
            </Box>

            {/* Weekday Selection Popover */}
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        minWidth: 200,
                        mt: 1,
                        borderRadius: 2,
                        boxShadow: 3,
                    }
                }}
            >
                <List sx={{ p: 1 }}>
                    {[
                        { value: 'monday', label: 'Montag', isWeekend: false },
                        { value: 'tuesday', label: 'Dienstag', isWeekend: false },
                        { value: 'wednesday', label: 'Mittwoch', isWeekend: false },
                        { value: 'thursday', label: 'Donnerstag', isWeekend: false },
                        { value: 'friday', label: 'Freitag', isWeekend: false },
                        { value: 'saturday', label: 'Samstag', isWeekend: true },
                        { value: 'sunday', label: 'Sonntag', isWeekend: true },
                    ].map((day) => (
                        <ListItem key={day.value} disablePadding>
                            <ListItemButton
                                onClick={() => handleDayChange(day.value as Weekday)}
                                selected={selectedWeekday === day.value}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    backgroundColor: day.isWeekend ? 'warning.50' : 'transparent',
                                    '&.Mui-selected': {
                                        backgroundColor: day.isWeekend ? 'warning.main' : 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: day.isWeekend ? 'warning.dark' : 'primary.dark',
                                        }
                                    },
                                    '&:hover': {
                                        backgroundColor: day.isWeekend ? 'warning.100' : 'primary.50',
                                    }
                                }}
                            >
                                <ListItemText 
                                    primary={day.label}
                                    primaryTypographyProps={{
                                        fontWeight: selectedWeekday === day.value ? 600 : 400,
                                        fontSize: '0.875rem',
                                        color: day.isWeekend && selectedWeekday !== day.value ? 'warning.dark' : 'inherit'
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Popover>

            {/* Calendar Week Selection Popover */}
            <Popover
                open={Boolean(kwAnchorEl)}
                anchorEl={kwAnchorEl}
                onClose={handleKwPopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        minWidth: 150,
                        mt: 1,
                        borderRadius: 2,
                        boxShadow: 3,
                    }
                }}
            >
                <List sx={{ p: 1 }}>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleKwPopoverClose}
                            sx={{
                                borderRadius: 1,
                                backgroundColor: isCurrentWeek ? 'success.main' : 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: isCurrentWeek ? 'success.dark' : 'primary.dark',
                                }
                            }}
                        >
                            <ListItemText 
                                primary={`KW ${patients[0]?.calendar_week || 'N/A'}`}
                                primaryTypographyProps={{
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}
                            />
                            {isCurrentWeek && (
                                <RadioButtonCheckedIcon 
                                    sx={{ 
                                        fontSize: '1rem', 
                                        ml: 1,
                                        opacity: 0.9
                                    }} 
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                </List>
            </Popover>

            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<RefreshIcon />}
                        onClick={handleImport}
                        disabled={!employees.length || patientImportMutation.isPending}
                    >
                        {patientImportMutation.isPending ? 'Importiere...' : `Excel Import${(lastImportTimeData?.last_import_time || lastPatientImportTime) ? ` (zuletzt ${new Date(lastImportTimeData?.last_import_time || lastPatientImportTime || '').toLocaleString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                        })})` : ''}`}
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

            {/* SearchField nur an Wochentagen anzeigen, nicht am Wochenende */}
            {selectedWeekday !== 'saturday' && selectedWeekday !== 'sunday' && (
                <SearchField
                    selectedDay={selectedWeekday}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onClearSearch={handleClearSearch}
                    onFilteredResultsChange={handleFilteredResultsChange}
                />
            )}

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <ToursView 
                    selectedDay={selectedWeekday} 
                    searchTerm={searchTerm}
                    filteredResults={filteredResults}
                />
            </Box>


        </Box>
    );
}; 