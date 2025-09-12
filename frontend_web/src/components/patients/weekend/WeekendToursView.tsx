import React, { useState, useCallback, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    Paper,
    Divider,
    IconButton,
    Collapse,
    Alert,
    CircularProgress
} from '@mui/material';
import { 
    Weekend as WeekendIcon, 
    ExpandMore as ExpandMoreIcon, 
    ExpandLess as ExpandLessIcon,
    Home as HomeIcon,
    Phone as PhoneIcon
} from '@mui/icons-material';
import { Weekday, Route, Patient, Appointment } from '../../../types/models';
import { useRoutes, useOptimizeWeekendRoutes, useReorderAppointment } from '../../../services/queries/useRoutes';
import { useAppointmentsByWeekday, useBatchMoveAppointments } from '../../../services/queries/useAppointments';
import { usePatients } from '../../../services/queries/usePatients';
import { useAreaStore } from '../../../stores/useAreaStore';
import { useRouteVisibility } from '../../../stores/useRouteVisibilityStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { WeekendPatientCard } from './WeekendPatientCard';
import { WeekendTourHeader } from './tour/WeekendTourHeader';
import { WeekendTourStats } from './tour/WeekendTourStats';
import { WeekendTourControls } from './tour/WeekendTourControls';
import { WeekendTourSummary } from './tour/WeekendTourSummary';
import { WeekendReassignMenu } from './tour/WeekendReassignMenu';

interface WeekendToursViewProps {
    selectedDay: Weekday;
}

const weekendAreas = ['Nord', 'Mitte', 'Süd'] as const;
type WeekendArea = typeof weekendAreas[number];

// Weekend Tour Container Component (similar to TourContainer)
interface WeekendTourContainerProps {
    area: WeekendArea;
    routes: Route[];
    appointments: Appointment[];
    patients: Patient[];
    selectedDay: Weekday;
}

const WeekendTourContainer: React.FC<WeekendTourContainerProps> = ({
    area,
    routes,
    appointments,
    patients,
    selectedDay
}) => {
    const [expanded, setExpanded] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [menuState, setMenuState] = useState<{
        open: boolean;
        anchorEl: HTMLElement | null;
    }>({
        open: false,
        anchorEl: null
    });
    const { hiddenPolylines, hiddenMarkers, togglePolyline, toggleMarker, hidePolyline, showPolyline, hideMarker, showMarker } = useRouteVisibility();
    const { setNotification, setLoading, resetLoading } = useNotificationStore();
    const optimizeWeekendRoutes = useOptimizeWeekendRoutes();
    const reorderAppointment = useReorderAppointment();
    const batchMoveAppointments = useBatchMoveAppointments();

    // Find the route for this area and day
    const route = routes.find(r => (r.area as string) === area && r.weekday === selectedDay && !r.employee_id);
    const routeId = route?.id;
    const isVisible = routeId !== undefined ? !hiddenPolylines.has(routeId) : false;

    // Get appointments for this area
    const areaAppointments = appointments.filter(app => (app.area as string) === area && !app.employee_id);
    
    // Group appointments by visit type
    const hbAppointments = areaAppointments.filter(app => app.visit_type === 'HB');
    const tkAppointments = areaAppointments.filter(app => app.visit_type === 'TK');
    const naAppointments = areaAppointments.filter(app => app.visit_type === 'NA');

    const getAreaBackgroundColor = (area: WeekendArea) => {
        switch (area) {
            case 'Nord': return 'rgba(25, 118, 210, 0.08)';
            case 'Mitte': return 'rgba(123, 31, 162, 0.08)';
            case 'Süd': return 'rgba(56, 142, 60, 0.08)';
            default: return 'rgba(255, 152, 0, 0.08)';
        }
    };

    const areaColor = (() => {
        switch (area) {
            case 'Nord': return '#1976d2';
            case 'Mitte': return '#7b1fa2';
            case 'Süd': return '#388e3c';
            default: return '#ff9800';
        }
    })();
    const backgroundColor = getAreaBackgroundColor(area);

    // Get patients for this area based on appointments
    const getPatientsForArea = useCallback((visitType: 'HB' | 'TK' | 'NA') => {
        const typeAppointments = areaAppointments.filter(app => app.visit_type === visitType);
        const patientIds = Array.from(new Set(typeAppointments.map(a => a.patient_id)));
        return patientIds
            .map(id => patients.find(p => p.id === id))
            .filter((p): p is Patient => p !== undefined);
    }, [areaAppointments, patients]);

    const hbPatients = getPatientsForArea('HB');
    const tkPatients = getPatientsForArea('TK');
    const naPatients = getPatientsForArea('NA');

    // Sort route patients (HB + NA) by route order
    const sortedRoutePatients = useMemo(() => {
        if (!route) return [...hbPatients, ...naPatients];

        // Create appointment ID to patient mapping
        const appointmentToPatient = new Map<number, Patient>();
        const allRoutePatients = [...hbPatients, ...naPatients];
        
        allRoutePatients.forEach(patient => {
            const patientAppts = areaAppointments.filter(app => 
                app.patient_id === patient.id && 
                (app.visit_type === 'HB' || app.visit_type === 'NA')
            );
            
            patientAppts.forEach(app => {
                if (app.id !== undefined) {
                    appointmentToPatient.set(app.id, patient);
                }
            });
        });
        
        // Create ordered patient list based on route order
        const orderedPatients: Patient[] = [];
        
        if (route.route_order) {
            let routeOrder: number[] = [];
            
            if (Array.isArray(route.route_order)) {
                routeOrder = route.route_order;
            } else {
                try {
                    const parsedOrder = JSON.parse(route.route_order as unknown as string);
                    if (Array.isArray(parsedOrder)) {
                        routeOrder = parsedOrder;
                    }
                } catch (error) {
                    console.error('Failed to parse route_order:', error);
                }
            }
                        
            // Add patients in the order specified by route_order
            for (const appointmentId of routeOrder) {
                const patient = appointmentToPatient.get(appointmentId);
                if (patient && !orderedPatients.includes(patient)) {
                    orderedPatients.push(patient);
                }
            }
            
            // Add any remaining HB/NA patients not in the route_order
            allRoutePatients.forEach(patient => {
                if (!orderedPatients.includes(patient)) {
                    orderedPatients.push(patient);
                }
            });
        } else {
            orderedPatients.push(...allRoutePatients);
        }
        
        return orderedPatients;
    }, [route, hbPatients, naPatients, areaAppointments]);

    // Check if there are any patients with appointments for the selected day
    const hasAppointmentsForDay = hbPatients.length > 0 || tkPatients.length > 0 || naPatients.length > 0;

    // Handler functions
    const handleOptimizeRoute = async () => {
        try {
            setIsOptimizing(true);
            await optimizeWeekendRoutes.mutateAsync({
                weekday: selectedDay.toLowerCase(),
                area: area
            });
            setNotification('Route erfolgreich optimiert', 'success');
        } catch (error) {
            console.error('Fehler beim Optimieren der Route:', error);
            setNotification('Fehler beim Optimieren der Route', 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMenuState({
            open: true,
            anchorEl: event.currentTarget
        });
    };

    const handleMenuClose = () => {
        setMenuState({
            open: false,
            anchorEl: null
        });
    };

    const handleMoveAllPatients = async (targetArea: string) => {
        setLoading('Alle Patienten werden zugewiesen...');
        try {
            await batchMoveAppointments.mutateAsync({
                sourceArea: area,
                targetArea,
                weekday: selectedDay
            });
            handleMenuClose();
            resetLoading();
            setNotification('Alle Patienten erfolgreich zugewiesen', 'success');
        } catch (error) {
            console.error('Fehler beim Verschieben aller Patienten:', error);
            setNotification('Fehler beim Verschieben aller Patienten', 'error');
        }
    };

    const handleMoveUp = async (patientId: number) => {
        if (!routeId) return;
        
        // Find the appointment for this patient
        const appointment = areaAppointments.find(a => a.patient_id === patientId);
        if (!appointment || !appointment.id) return;
        
        setLoading('Patient wird verschoben...');
        try {
            await reorderAppointment.mutateAsync({
                routeId: routeId,
                appointmentId: appointment.id,
                direction: 'up'
            });
            setNotification('Patient verschoben', 'success');
        } catch (error) {
            setNotification('Fehler beim Verschieben des Patienten', 'error');
        } finally {
            resetLoading();
        }
    };

    const handleMoveDown = async (patientId: number) => {
        if (!routeId) return;
        
        // Find the appointment for this patient
        const appointment = areaAppointments.find(a => a.patient_id === patientId);
        if (!appointment || !appointment.id) return;
        
        setLoading('Patient wird verschoben...');
        try {
            await reorderAppointment.mutateAsync({
                routeId: routeId,
                appointmentId: appointment.id,
                direction: 'down'
            });
            setNotification('Patient verschoben', 'success');
        } catch (error) {
            setNotification('Fehler beim Verschieben des Patienten', 'error');
        } finally {
            resetLoading();
        }
    };

    return (
        <Paper 
            elevation={2} 
            sx={{ 
                mb: 3, 
                p: 2,
                transition: 'all 0.3s ease',
                width: '100%',
                height: 'fit-content',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: expanded ? 'auto' : '100px',
                borderWidth: 2.5,
                borderColor: areaColor,
                borderStyle: 'solid',
                backgroundColor: backgroundColor
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start' 
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <WeekendTourHeader area={area} />

                    <WeekendTourStats area={area} route={route} />
                    
                    <WeekendTourControls
                        expanded={expanded}
                        isOptimizing={isOptimizing}
                        tourPatientsCount={sortedRoutePatients.length}
                        routeId={routeId}
                        isVisible={isVisible}
                        onOptimizeRoute={handleOptimizeRoute}
                        onMenuOpen={handleMenuOpen}
                        onToggleVisibility={() => {
                            if (routeId !== undefined) {
                                if (isVisible) {
                                    hidePolyline(routeId);
                                    hideMarker(routeId);
                                } else {
                                    showPolyline(routeId);
                                    showMarker(routeId);
                                }
                            }
                        }}
                    />
                </Box>
                
                <IconButton 
                    onClick={() => setExpanded(!expanded)} 
                    size="small"
                    aria-label={expanded ? "Einklappen" : "Ausklappen"}
                    color="primary"
                    sx={{ ml: 1 }}
                >
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>
            
            {!expanded && (
                <WeekendTourSummary
                    hbAppointmentsCount={hbAppointments.length}
                    tkAppointmentsCount={tkAppointments.length}
                    naAppointmentsCount={naAppointments.length}
                />
            )}
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 1 }} />
                
                {hasAppointmentsForDay ? (
                    <>
                        {/* HB Patienten (Route) */}
                        {sortedRoutePatients.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                    <HomeIcon color="primary" />
                                    <Typography variant="h6" sx={{ ml: 1 }}>
                                        Route ({sortedRoutePatients.length})
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {sortedRoutePatients.map((patient, index) => {
                                        const patientAppointments = areaAppointments.filter(app => 
                                            app.patient_id === patient.id && 
                                            (app.visit_type === 'HB' || app.visit_type === 'NA')
                                        );
                                        const hasHB = patientAppointments.some(app => app.visit_type === 'HB');
                                        const hasNA = patientAppointments.some(app => app.visit_type === 'NA');
                                        const visitType = hasHB ? 'HB' : hasNA ? 'NA' : 'HB'; // Default to HB if somehow neither exists
                                        
                                        return (
                                            <WeekendPatientCard
                                                key={patient.id}
                                                patient={patient}
                                                appointments={patientAppointments}
                                                visitType={visitType}
                                                index={index + 1}
                                                selectedDay={selectedDay}
                                                area={area}
                                                onMoveUp={handleMoveUp}
                                                onMoveDown={handleMoveDown}
                                                isFirst={index === 0}
                                                isLast={index === sortedRoutePatients.length - 1}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}

                        {/* TK Patienten */}
                        {tkPatients.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                        p: 2,
                                        bgcolor: 'rgba(76, 175, 80, 0.04)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'success.main' }}>
                                        <PhoneIcon color="success" />
                                        <Typography variant="h6" sx={{ ml: 1 }}>
                                            Telefonkontakte ({tkPatients.length})
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {tkPatients.map((patient) => {
                                            const patientAppointments = areaAppointments.filter(app => 
                                                app.patient_id === patient.id && app.visit_type === 'TK'
                                            );
                                            return (
                                                <WeekendPatientCard
                                                    key={patient.id}
                                                    patient={patient}
                                                    appointments={patientAppointments}
                                                    visitType="TK"
                                                    compact={true}
                                                    selectedDay={selectedDay}
                                                    area={area}
                                                />
                                            );
                                        })}
                                    </Box>
                                </Paper>
                            </Box>
                        )}

                    </>
                ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Keine Termine geplant.
                    </Alert>
                )}
            </Collapse>
            
            <WeekendReassignMenu
                open={menuState.open}
                anchorEl={menuState.anchorEl}
                onClose={handleMenuClose}
                currentArea={area}
                onMoveAllPatients={handleMoveAllPatients}
            />
        </Paper>
    );
};

export const WeekendToursView: React.FC<WeekendToursViewProps> = ({ selectedDay }) => {
    const { data: routes = [], isLoading: loadingRoutes, error: routesError } = useRoutes({ 
        weekday: selectedDay,
        weekend_only: true 
    });
    const { data: appointments = [], isLoading: loadingAppointments, error: appointmentsError } = useAppointmentsByWeekday(selectedDay);
    const { data: patients = [], isLoading: loadingPatients, error: patientsError } = usePatients();
    const { currentArea } = useAreaStore();

    // Filter routes by area - for weekends, always show Mitte and filter others based on currentArea
    const isAllAreas = currentArea === 'Nord- und Südkreis';
    const filteredRoutes = isAllAreas 
        ? routes 
        : routes.filter(r => {
            // Always show Mitte
            if ((r.area as string) === 'Mitte') return true;
            // Filter others based on currentArea
            if (currentArea === 'Nordkreis') return (r.area as string) === 'Nord';
            if (currentArea === 'Südkreis') return (r.area as string) === 'Süd';
            return false;
        });

    if (loadingRoutes || loadingAppointments || loadingPatients) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (routesError || appointmentsError || patientsError) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                {routesError?.message || appointmentsError?.message || patientsError?.message || 'Fehler beim Laden der Wochenend-Touren'}
            </Alert>
        );
    }

    if (filteredRoutes.length === 0) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                Keine Wochenend-Touren gefunden für {selectedDay === 'saturday' ? 'Samstag' : 'Sonntag'}.
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WeekendIcon />
                    Wochenend-Touren
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {weekendAreas.map((area) => {
                    const areaRoutes = filteredRoutes.filter(r => (r.area as string) === area);
                    
                    if (areaRoutes.length === 0) return null;

                    return (
                        <WeekendTourContainer
                            key={area}
                            area={area}
                            routes={filteredRoutes}
                            appointments={appointments}
                            patients={patients}
                            selectedDay={selectedDay}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};
