import React, { useState, useRef, useCallback } from 'react';
import { 
    Box, 
    Typography, 
    Paper,
    Divider,
    List,
    ListItem,
    IconButton,
    Collapse,
    Chip,
    Alert,
    Snackbar
} from '@mui/material';
import { 
    Home as HomeIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AddCircle as AddCircleIcon
} from '@mui/icons-material';
import { useDrop } from 'react-dnd';
import { Patient, Appointment, Weekday, Employee, Route } from '../../types/models';
import { PatientCard } from './PatientCard';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { useDrag } from '../../contexts/DragContext';
import { appointmentsApi } from '../../services/api/appointments';
import { getColorForTour } from '../../utils/colors';

interface TourContainerProps {
    employee: Employee;
    patients: Patient[];
    appointments: Appointment[];
    selectedDay: Weekday;
    routes: Route[];
    onPatientMoved?: (patient: Patient, newTourNumber: number, hbAppointments?: Appointment[]) => void;
}

export const TourContainer: React.FC<TourContainerProps> = ({
    employee,
    patients,
    appointments,
    selectedDay,
    routes,
    onPatientMoved
}) => {
    // State zum Tracking des ausgeklappten/eingeklappten Zustands
    const [expanded, setExpanded] = useState(false);
    const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({ 
        open: false, 
        message: '', 
        severity: 'success' 
    });
    const dropRef = useRef<HTMLDivElement>(null);
    const { updatePatientTour, updateAppointmentEmployee, error } = useDrag();
    
    // Finde die Route für diesen Mitarbeiter und diesen Tag
    const employeeRoute = routes.find(r => 
        r.employee_id === employee.id && 
        r.weekday === selectedDay.toLowerCase()
    );
    
    // Formatiere Distanz und Zeit für die Anzeige
    const getFormattedRouteData = () => {
        if (!employeeRoute) return null;
        
        let formattedDistance = null;
        let formattedTotalTime = null;
        
        // Formatiere die Distanz, falls vorhanden
        if (employeeRoute.total_distance) {
            formattedDistance = `${employeeRoute.total_distance.toFixed(1)} km`;
        }
        
        // Formatiere die Gesamtzeit, falls vorhanden
        if (employeeRoute.total_duration) {
            const totalMinutes = employeeRoute.total_duration;
            formattedTotalTime = totalMinutes >= 60
                ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`
                : `${totalMinutes}min`;
        }
        
        return {
            totalDistance: formattedDistance,
            totalTime: formattedTotalTime
        };
    };
    
    // Hole die formatierte Routendaten
    const routeData = getFormattedRouteData();

    // Toggle für expanded state
    const toggleExpand = () => {
        setExpanded(!expanded);
    };
    
    /**
     * Konfiguration der Drop-Funktionalität
     * 
     * Ermöglicht das Ziehen und Ablegen eines Patienten in einer neuen Tour
     * Initiiert den gesamten Patientenverschiebungsprozess
     */
    const [{ isOver, canDrop }, drop] = useDrop<PatientDragItem, unknown, { isOver: boolean; canDrop: boolean }>({
        accept: DragItemTypes.PATIENT,
        drop: async (item) => {
            // Nichts tun, wenn der Patient in die gleiche Tour gezogen wird
            if (item.sourceTourNumber === employee.tour_number) {
                return;
            }
            
            try {
                const patientId = item.patientId;
                const patient = patients.find(p => p.id === patientId);
                
                if (!patient) {
                    console.error(`Patient mit ID ${patientId} nicht gefunden`);
                    return;
                }
                
                console.log(`Verschiebe Patient ${patientId} (${patient.first_name} ${patient.last_name}) von Tour ${item.sourceTourNumber} zu Tour ${employee.tour_number}`);
                
                // Schritt 1: Aktualisiere die Tour-Nummer des Patienten
                console.log(`1. Aktualisiere Tour-Nummer des Patienten zu ${employee.tour_number}`);
                await updatePatientTour(patientId, employee.tour_number);
                
                // Schritt 2: Finde ALLE Termine dieses Patienten (über ALLE Tage hinweg)
                const allPatientAppointments = await appointmentsApi.getByPatientId(patientId);
                
                console.log(`2. Aktualisiere alle ${allPatientAppointments.length} Termine des Patienten zu Mitarbeiter ${employee.id}`);
                
                // Aktualisiere alle Termine mit dem neuen Mitarbeiter
                for (const appt of allPatientAppointments) {
                    if (appt.id) {
                        console.log(`   Aktualisiere Termin ${appt.id} (${appt.weekday}) zu Mitarbeiter ${employee.id}`);
                        await updateAppointmentEmployee(appt.id, employee.id);
                    }
                }
                
                // Zeige Erfolgsbenachrichtigung an
                setNotification({
                    open: true,
                    message: `Patient erfolgreich zu Tour ${employee.tour_number} verschoben`,
                    severity: 'success'
                });
                
                // Schritt 3: Aktualisiere die Routen-Reihenfolgen (wird von der übergeordneten Komponente verarbeitet)
                if (onPatientMoved) {
                    // Extrahiere nur die HB-Termine, die für Routenaktualisierungen relevant sind
                    const hbAppointments = allPatientAppointments.filter(a => a.visit_type === 'HB');
                    console.log(`3. Benachrichtige ToursView zur Aktualisierung der Route-Reihenfolge für ${hbAppointments.length} HB-Termine`);
                    
                    // Übergebe Patient und Tour-Nummer sowie HB-Termine an die übergeordnete Komponente
                    onPatientMoved(patient, employee.tour_number || 0, hbAppointments);
                }
            } catch (err) {
                console.error('Fehler beim Verschieben des Patienten:', err);
                // Zeige Fehlerbenachrichtigung an
                setNotification({
                    open: true,
                    message: error || 'Fehler beim Verschieben des Patienten',
                    severity: 'error'
                });
            }
        },
        canDrop: (item) => item.sourceTourNumber !== employee.tour_number, // Nur das Ablegen in einer anderen Tour erlauben
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop()
        })
    });
    
    // Drop-Ref auf unseren Container anwenden
    drop(dropRef);

    // Filtere Termine für den ausgewählten Tag und diesen Mitarbeiter
    const employeeAppointments = appointments.filter(a => 
        a.employee_id === employee.id && a.weekday === selectedDay
    );
    
    // Function to get appointments for a specific patient and the selected day
    const getPatientAppointments = useCallback((patientId: number) => {
        return employeeAppointments.filter(a => a.patient_id === patientId);
    }, [employeeAppointments]);
    
    // 3. Patients for this tour (based on tour assignment)
    const tourPatients = patients.filter(p => p.tour === employee.tour_number);
    
    // Group patients by their appointment types (HB, TK, NA, or empty string)
    const getFilteredPatients = (visitType: 'HB' | 'NA' | 'TK' | '') => {
        // Find all appointments with this specific visit type
        const typeAppointments = employeeAppointments.filter(a => a.visit_type === visitType);
        
        // Get unique patient IDs
        const patientIds = Array.from(new Set(typeAppointments.map(a => a.patient_id)));
        
        // Return the corresponding patients
        return patientIds
            .map(id => patients.find(p => p.id === id))
            .filter((p): p is Patient => p !== undefined);
    };
    
    // Get patients by visit type
    const hbPatients = getFilteredPatients('HB');
    const tkPatients = getFilteredPatients('TK');
    const naPatients = getFilteredPatients('NA');
    const emptyTypePatients = getFilteredPatients('');
    
    // Sort HB patients by route order
    const sortedHbPatients = React.useMemo(() => {
        // Find route for this employee on the selected day
        const route = routes.find(r => 
            r.employee_id === employee.id && 
            r.weekday === selectedDay.toLowerCase()
        );

        // Create appointment ID to patient mapping
        const appointmentToPatient = new Map<number, Patient>();
        hbPatients.forEach(patient => {
            // Find all HB appointments for this patient
            const patientAppts = getPatientAppointments(patient.id || 0)
                .filter(app => app.visit_type === 'HB');
            
            // Map appointment IDs to the patient
            patientAppts.forEach(app => {
                if (app.id !== undefined) {
                    appointmentToPatient.set(app.id, patient);
                }
            });
        });
        
        // Create ordered patient list based on route order
        const orderedPatients: Patient[] = [];
        
        if (route) {
            // Handle route_order (could be array or string)
            let routeOrder: number[] = [];
            
            if (route.route_order) {
                // If route_order is already an array, use it
                if (Array.isArray(route.route_order)) {
                    routeOrder = route.route_order;
                } else {
                    // Otherwise, try to parse it as JSON string
                    try {
                        const parsedOrder = JSON.parse(route.route_order as unknown as string);
                        if (Array.isArray(parsedOrder)) {
                            routeOrder = parsedOrder;
                        } else {
                            console.warn('Parsed route_order is not an array:', parsedOrder);
                        }
                    } catch (error) {
                        console.error('Failed to parse route_order:', error);
                    }
                }
            }
                        
            // Add patients in the order specified by route_order
            for (const appointmentId of routeOrder) {
                const patient = appointmentToPatient.get(appointmentId);
                if (patient && !orderedPatients.includes(patient)) {
                    orderedPatients.push(patient);
                }
            }
            
            // Add any remaining HB patients not in the route_order
            hbPatients.forEach(patient => {
                if (!orderedPatients.includes(patient)) {
                    orderedPatients.push(patient);
                }
            });
        } else {
            // No route exists, just use all HB patients
            orderedPatients.push(...hbPatients);
        }
        
        return orderedPatients;
    }, [employee.id, selectedDay, hbPatients, routes, getPatientAppointments]);
    
    // Get the title for the tour container
    const getTourTitle = () => {
        if (employee.tour_number) {
            return `Tour ${employee.tour_number}: ${employee.first_name} ${employee.last_name}`;
        }
        return `${employee.first_name} ${employee.last_name} (Keine Tour)`;
    };
    
    const SectionTitle = ({ 
        icon, 
        title, 
        count, 
        color 
    }: { 
        icon: React.ReactNode, 
        title: string, 
        count: number,
        color: string
    }) => (
        <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 1,
            color
        }}>
            {icon}
            <Typography variant="subtitle1" component="h4" fontWeight="bold">
                {title} ({count})
            </Typography>
        </Box>
    );
    
    // Check if there are any patients with appointments for the selected day
    const hasAppointmentsForDay = hbPatients.length > 0 || tkPatients.length > 0 || naPatients.length > 0 || emptyTypePatients.length > 0;
    
    // Summary for collapsed state
    const patientSummary = `${tourPatients.length} Patienten${hasAppointmentsForDay ? `: ${hbPatients.length} Hausbesuche, ${tkPatients.length} Telefonkontakte, ${naPatients.length} Neuaufnahmen${emptyTypePatients.length > 0 ? `, ${emptyTypePatients.length} ohne Besuch` : ''}` : ', keine Termine heute'}`;
    
    // Define the border style based on drag and drop state
    const getBorderStyle = () => {
        if (isOver && canDrop) {
            return {
                borderColor: 'success.main',
                borderStyle: 'dashed',
                borderWidth: 2,
                boxShadow: 3
            };
        }
        if (canDrop) {
            return {
                borderColor: 'info.main',
                borderStyle: employee.tour_number ? 'solid' : 'dashed',
                borderWidth: employee.tour_number ? 5 : 2
            };
        }
        return {
            borderLeft: employee.tour_number ? 5 : 2,
            borderColor: employee.tour_number ? getColorForTour(employee.tour_number) : 'grey.400',
        };
    };
    
    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };
    
    return (
        <>
            <Paper 
                ref={dropRef}
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
                    ...getBorderStyle(),
                    backgroundColor: isOver && canDrop ? 'rgba(76, 175, 80, 0.08)' : 'background.paper'
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <Typography 
                        variant="h6" 
                        component="h3" 
                        sx={{ 
                            fontWeight: 'bold',
                            color: employee.tour_number ? getColorForTour(employee.tour_number) : 'text.primary'
                        }}
                    >
                        {getTourTitle()}
                    </Typography>
                    
                    {/* Anzeige der Strecke und Gesamtzeit */}
                    {routeData && (routeData.totalDistance || routeData.totalTime) && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1,
                            mr: 1,
                            flexShrink: 0
                        }}>
                            {routeData.totalDistance && (
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                    {routeData.totalDistance}
                                </Typography>
                            )}
                            {routeData.totalTime && (
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                                    {routeData.totalTime}
                                </Typography>
                            )}
                        </Box>
                    )}
                    
                    <IconButton 
                        onClick={toggleExpand} 
                        size="small"
                        aria-label={expanded ? "Einklappen" : "Ausklappen"}
                        color="primary"
                        sx={{ ml: 1 }}
                    >
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>
                
                {!expanded && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {patientSummary}
                        </Typography>
                        {hasAppointmentsForDay && (
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, gap: 1 }}>
                                {hbPatients.length > 0 && (
                                    <Chip size="small" icon={<HomeIcon fontSize="small" />} label={hbPatients.length} color="primary" variant="outlined" />
                                )}
                                {tkPatients.length > 0 && (
                                    <Chip size="small" icon={<PhoneIcon fontSize="small" />} label={tkPatients.length} color="success" variant="outlined" />
                                )}
                                {naPatients.length > 0 && (
                                    <Chip size="small" icon={<AddCircleIcon fontSize="small" />} label={naPatients.length} color="secondary" variant="outlined" />
                                )}
                                {emptyTypePatients.length > 0 && (
                                    <Chip size="small" icon={<PersonIcon fontSize="small" />} label={emptyTypePatients.length} color="default" variant="outlined" />
                                )}
                            </Box>
                        )}
                    </Box>
                )}
                
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Divider sx={{ my: 1 }} />
                    
                    {hasAppointmentsForDay ? (
                        <>
                            {/* Home visits (HB) section */}
                            <SectionTitle 
                                icon={<HomeIcon color="primary" />} 
                                title="Hausbesuche" 
                                count={sortedHbPatients.length}
                                color="primary.main"
                            />
                            
                            {sortedHbPatients.length > 0 ? (
                                <List dense disablePadding>
                                    {sortedHbPatients.map((patient, index) => (
                                        <ListItem 
                                            key={`hb-${patient.id}`} 
                                            disablePadding 
                                            sx={{ mb: 1 }}
                                        >
                                            <PatientCard
                                                patient={patient}
                                                appointments={getPatientAppointments(patient.id || 0)}
                                                visitType="HB"
                                                index={index + 1}
                                                selectedDay={selectedDay}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                                    Keine Hausbesuche für diesen Tag geplant.
                                </Typography>
                            )}
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                                {/* Phone contacts (TK) section */}
                                <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                        flex: {
                                            xs: '1 1 100%',
                                            sm: '1 1 47%'
                                        },
                                        minWidth: {
                                            xs: '100%',
                                            sm: '300px'
                                        },
                                        p: 2,
                                        bgcolor: 'rgba(76, 175, 80, 0.04)'
                                    }}
                                >
                                    <SectionTitle 
                                        icon={<PhoneIcon color="success" />} 
                                        title="Telefonkontakte" 
                                        count={tkPatients.length}
                                        color="success.main"
                                    />
                                    
                                    {tkPatients.length > 0 ? (
                                        <List dense disablePadding>
                                            {tkPatients.map((patient) => (
                                                <ListItem 
                                                    key={`tk-${patient.id}`} 
                                                    disablePadding 
                                                    sx={{ mb: 1 }}
                                                >
                                                    <PatientCard
                                                        patient={patient}
                                                        appointments={getPatientAppointments(patient.id || 0)}
                                                        visitType="TK"
                                                        compact
                                                        selectedDay={selectedDay}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Keine Telefonkontakte für diesen Tag geplant.
                                        </Typography>
                                    )}
                                </Paper>
                                
                                {/* New admissions (NA) section */}
                                <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                        flex: {
                                            xs: '1 1 100%',
                                            sm: '1 1 47%'
                                        },
                                        minWidth: {
                                            xs: '100%',
                                            sm: '300px'
                                        },
                                        p: 2,
                                        bgcolor: 'rgba(156, 39, 176, 0.04)'
                                    }}
                                >
                                    <SectionTitle 
                                        icon={<AddCircleIcon color="secondary" />} 
                                        title="Neuaufnahmen" 
                                        count={naPatients.length}
                                        color="secondary.main"
                                    />
                                    
                                    {naPatients.length > 0 ? (
                                        <List dense disablePadding>
                                            {naPatients.map((patient) => (
                                                <ListItem 
                                                    key={`na-${patient.id}`} 
                                                    disablePadding 
                                                    sx={{ mb: 1 }}
                                                >
                                                    <PatientCard
                                                        patient={patient}
                                                        appointments={getPatientAppointments(patient.id || 0)}
                                                        visitType="NA"
                                                        compact
                                                        selectedDay={selectedDay}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Keine Neuaufnahmen für diesen Tag geplant.
                                        </Typography>
                                    )}
                                </Paper>
                            </Box>
                            
                            {/* Patients with empty visit type */}
                            {emptyTypePatients.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2,
                                            bgcolor: 'rgba(158, 158, 158, 0.04)'
                                        }}
                                    >
                                        <SectionTitle 
                                            icon={<PersonIcon color="action" />} 
                                            title="Patienten ohne geplanten Besuch" 
                                            count={emptyTypePatients.length}
                                            color="text.secondary"
                                        />
                                        
                                        <List dense disablePadding>
                                            {emptyTypePatients.map((patient) => (
                                                <ListItem 
                                                    key={`empty-${patient.id}`} 
                                                    disablePadding 
                                                    sx={{ width: '100%' }}
                                                >
                                                    <PatientCard
                                                        patient={patient}
                                                        appointments={getPatientAppointments(patient.id || 0)}
                                                        visitType="none"
                                                        compact
                                                        selectedDay={selectedDay}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Keine Termine für diesen Tag geplant.
                        </Alert>
                    )}
                </Collapse>
            </Paper>
            
            <Snackbar 
                open={notification.open} 
                autoHideDuration={6000} 
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </>
    );
}; 