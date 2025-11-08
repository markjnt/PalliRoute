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
import { useRoutes } from '../../../services/queries/useRoutes';
import { useAppointmentsByWeekday } from '../../../services/queries/useAppointments';
import { usePatients } from '../../../services/queries/usePatients';
import { useAreaStore } from '../../../stores/useAreaStore';
import { WeekendPatientCard } from './WeekendPatientCard';
import { WeekendTourHeader } from './tour/WeekendTourHeader';
import { WeekendTourStats } from './tour/WeekendTourStats';
import { WeekendTourControls } from './tour/WeekendTourControls';
import { WeekendTourSummary } from './tour/WeekendTourSummary';
import { UnassignedWeekendAppointments } from './UnassignedWeekendAppointments';
import { 
    usePatientManagement, 
    useRouteManagement, 
    useAppointmentManagement, 
    useAreaManagement,
    useRouteVisibility 
} from '../../../hooks';

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

    // Custom hooks for business logic
    const patientManagement = usePatientManagement({
        patients,
        appointments,
        selectedDay,
        area
    });

    const routeManagement = useRouteManagement({
        selectedDay,
        area
    });

    const appointmentManagement = useAppointmentManagement({
        selectedDay
    });

    const areaManagement = useAreaManagement({
        routes,
        appointments,
        selectedDay
    });

    // Find the route for this area and day
    const route = routes.find(r => (r.area as string) === area && r.weekday === selectedDay && !r.employee_id);
    const routeId = route?.id;

    // Get route visibility using custom hook
    const routeVisibility = useRouteVisibility({ routeId });
    const isVisible = routeVisibility.isVisible;

    // Get patients using custom hook
    const {
        hbPatients,
        tkPatients,
        naPatients,
        getSortedRoutePatients,
        hasAppointmentsForDay
    } = patientManagement;

    const sortedRoutePatients = getSortedRoutePatients(route);

    // Get area colors using custom hook
    const backgroundColor = areaManagement.getAreaBackgroundColor(area);
    const areaColor = areaManagement.getAreaColor(area);

    // Get appointments for this area
    const areaAppointments = appointments.filter(app => (app.area as string) === area && !app.employee_id);
    
    // Group appointments by visit type
    const hbAppointments = areaAppointments.filter(app => app.visit_type === 'HB');
    const tkAppointments = areaAppointments.filter(app => app.visit_type === 'TK');
    const naAppointments = areaAppointments.filter(app => app.visit_type === 'NA');


    // Handler functions
    const handleOptimizeRoute = async () => {
        await routeManagement.optimizeWeekendRoute();
    };



    const handleMoveUp = async (patientId: number) => {
        if (!routeId) return;
        
        const appointment = areaAppointments.find(a => a.patient_id === patientId);
        if (!appointment || !appointment.id) return;
        
        await routeManagement.movePatientUp(routeId, appointment.id);
    };

    const handleMoveDown = async (patientId: number) => {
        if (!routeId) return;
        
        const appointment = areaAppointments.find(a => a.patient_id === patientId);
        if (!appointment || !appointment.id) return;
        
        await routeManagement.movePatientDown(routeId, appointment.id);
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
                        isOptimizing={routeManagement.isOptimizing}
                        tourPatientsCount={sortedRoutePatients.length}
                        routeId={routeId}
                        isVisible={isVisible}
                        onOptimizeRoute={handleOptimizeRoute}
                        onToggleVisibility={routeVisibility.toggleVisibility}
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
    const appointmentManagement = useAppointmentManagement({
        selectedDay
    });

    // Custom hooks for business logic
    const areaManagement = useAreaManagement({
        routes,
        appointments,
        selectedDay,
        currentArea: currentArea || undefined
    });

    // Get filtered routes and weekend areas using custom hook
    const filteredRoutes = areaManagement.getFilteredRoutes();
    const weekendRoutesByArea = areaManagement.getWeekendRoutesByArea();
    const weekendAreas = areaManagement.getWeekendAreas();

    const unassignedAppointments = useMemo(() => {
        const filteredAppointments = appointments.filter((app) => 
            app.weekday === selectedDay &&
            (app.area as string) === 'Nicht zugewiesen' &&
            !app.employee_id
        );

        return filteredAppointments.map((appointment) => ({
            appointment,
            patient: patients.find((patient) => patient.id === appointment.patient_id)
        }));
    }, [appointments, patients, selectedDay]);

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

    // Show "no routes found" message if no weekend routes exist
    if (filteredRoutes.length === 0 && unassignedAppointments.length === 0) {
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

            <UnassignedWeekendAppointments
                appointments={unassignedAppointments}
                onAssignArea={appointmentManagement.assignWeekendArea}
                isAssigning={appointmentManagement.isAssigningWeekendArea}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {weekendAreas.map((area) => {
                    const areaRoutes = weekendRoutesByArea.get(area);
                    
                    // Only show areas that have routes
                    if (!areaRoutes || areaRoutes.length === 0) {
                        return null;
                    }

                    return (
                        <WeekendTourContainer
                            key={area}
                            area={area as WeekendArea}
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
