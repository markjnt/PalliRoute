import React, { useState, useRef, useCallback, useEffect } from 'react';
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
    Snackbar,
    Tooltip,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import { 
    Home as HomeIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AddCircle as AddCircleIcon,
    CheckCircle,
    Cancel,
    Warning as WarningIcon,
    Route as RouteIcon,
    SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { useDrop } from 'react-dnd';
import { Patient, Appointment, Weekday, Employee, Route } from '../../types/models';
import { PatientCard } from './PatientCard';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { useAssignPatientStore } from '../../stores';
import { appointmentsApi } from '../../services/api/appointments';
import { getColorForTour, employeeTypeColors } from '../../utils/colors';
import { routesApi } from '../../services/api/routes';
import { useOptimizeRoutes } from '../../services/queries/useRoutes';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useRoutes } from '../../services/queries/useRoutes';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '../../services/queries/useEmployees';

// Helper component for section titles
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
    const dropRef = useRef<HTMLDivElement>(null);
    
    // Verwende den useAssignPatientStore anstelle des DragContext
    const updatePatientTour = useAssignPatientStore(state => state.updatePatientTour);
    const updateAppointmentEmployee = useAssignPatientStore(state => state.updateAppointmentEmployee);
    const updateRouteOrder = useAssignPatientStore(state => state.updateRouteOrder);
    const error = useAssignPatientStore(state => state.error);
    const { notification, setNotification, closeNotification } = useNotificationStore();
    
    const queryClient = useQueryClient();
    
    // Berechne die maximale Arbeitszeit basierend auf dem Stellenumfang
    const getMaxWorkingMinutes = useCallback(() => {
        // 100% Stellenumfang entspricht 7 Stunden (420 Minuten)
        const FULL_TIME_MINUTES = 7 * 60; // 7 Stunden = 420 Minuten
        return (employee.work_hours / 100) * FULL_TIME_MINUTES;
    }, [employee.work_hours]);
    
    // Check if employee is inactive but has a tour
    const showInactiveWarning = !employee.is_active && employee.tour_number !== null && employee.tour_number !== undefined;
    
    // Finde die Route für diesen Mitarbeiter und diesen Tag
    const employeeRoute = routes.find(r => 
        r.employee_id === employee.id && 
        r.weekday === selectedDay.toLowerCase()
    );
    
    // Formatiere Distanz und Zeit für die Anzeige
    const getFormattedRouteData = useCallback(() => {
        // Berechne immer die maximale Arbeitszeit, auch wenn keine Route existiert
        const maxWorkingMinutes = getMaxWorkingMinutes();
        
        // Formatiere die Maximalzeit im HH:MM Format
        const maxHours = Math.floor(maxWorkingMinutes / 60);
        const maxMinutes = maxWorkingMinutes % 60;
        const maxTimeFormatted = `${maxHours}:${maxMinutes.toString().padStart(2, '0')}`;
            
        if (!employeeRoute) {
            // Wenn keine Route existiert, zeige "0 km" und "0:00 / max time"
            return {
                totalDistance: "0.0 km",
                totalTime: "0:00",
                isWithinWorkHours: true,
                timeRatio: `0:00 / ${maxTimeFormatted}`
            };
        }
        
        let formattedDistance = "0.0 km"; // Standard auf 0 km setzen
        let formattedTotalTime = null;
        let isWithinWorkHours = true;
        let timeRatio = '';
        
        // Formatiere die Distanz, falls vorhanden
        if (employeeRoute.total_distance) {
            formattedDistance = `${employeeRoute.total_distance.toFixed(1)} km`;
        }
        
        // Formatiere die Gesamtzeit, falls vorhanden
        if (employeeRoute.total_duration) {
            const totalMinutes = employeeRoute.total_duration;
            
            // Formatiere im HH:MM Format
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            formattedTotalTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
                
            // Prüfe, ob die Zeit innerhalb der Arbeitszeit liegt
            isWithinWorkHours = totalMinutes <= maxWorkingMinutes;
            
            // Erstelle das Verhältnis "aktuelle Zeit / maximale Zeit"
            timeRatio = `${formattedTotalTime} / ${maxTimeFormatted}`;
        } else {
            // Wenn keine Dauer vorhanden ist, zeige "0:00 / max time"
            formattedTotalTime = "0:00";
            timeRatio = `0:00 / ${maxTimeFormatted}`;
        }
        
        return {
            totalDistance: formattedDistance,
            totalTime: formattedTotalTime,
            isWithinWorkHours,
            timeRatio
        };
    }, [employeeRoute, getMaxWorkingMinutes]);
    
    // Hole die formatierte Routendaten
    const [routeData, setRouteData] = useState(getFormattedRouteData());
    
    // Update route data whenever employeeRoute changes
    useEffect(() => {
        setRouteData(getFormattedRouteData());
    }, [employeeRoute, getFormattedRouteData]);

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
            
            // Prevent dropping onto a deactivated employee's tour
            if (!employee.is_active) {
                setNotification('Der Mitarbeiter ist deaktiviert. Bitte wählen Sie einen aktiven Mitarbeiter für diese Tour.', 'error');
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
                setNotification(`Patient erfolgreich zu Tour ${employee.tour_number} verschoben`, 'success');
                
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
                setNotification('Fehler beim Verschieben des Patienten', 'error');
            }
        },
        canDrop: (item) => item.sourceTourNumber !== employee.tour_number && employee.is_active, // Only allow dropping on active employees 
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
    
    // Check if there are any patients with appointments for the selected day
    const hasAppointmentsForDay = hbPatients.length > 0 || tkPatients.length > 0 || naPatients.length > 0 || emptyTypePatients.length > 0;
    
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
    
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const optimizeRoutesMutation = useOptimizeRoutes();
    const { refetch: refetchRoutes } = useRoutes({ weekday: selectedDay.toLowerCase() as Weekday });
    const { data: employeesData = [] } = useEmployees();

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleOptimizeRoute = async () => {
        if (!employee.id) return;
        
        setIsOptimizing(true);
        try {
            await optimizeRoutesMutation.mutateAsync({
                date: selectedDay.toLowerCase(),
                employeeId: employee.id
            });
            // Invalidate routes query to trigger a refetch
            await queryClient.invalidateQueries({ queryKey: ['routes'] });
            setNotification('Route wurde erfolgreich optimiert', 'success');
        } catch (error) {
            setNotification('Fehler beim Optimieren der Route', 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    // Function to handle moving a patient up in the route order
    const handleMoveUp = async (patientId: number) => {
        // Find route for this employee on the selected day
        const route = routes.find(r => 
            r.employee_id === employee.id && 
            r.weekday === selectedDay.toLowerCase()
        );
        
        if (!route || !route.id || !route.route_order) {
            setNotification('Keine Route gefunden oder keine Reihenfolge definiert', 'error');
            return;
        }
        
        // Get current route order
        let routeOrder: number[] = [];
        if (Array.isArray(route.route_order)) {
            routeOrder = [...route.route_order];
        } else {
            try {
                const parsedOrder = JSON.parse(route.route_order as unknown as string);
                if (Array.isArray(parsedOrder)) {
                    routeOrder = [...parsedOrder];
                }
            } catch (error) {
                console.error('Failed to parse route_order:', error);
                setNotification('Fehler beim Verarbeiten der Routenreihenfolge', 'error');
                return;
            }
        }
        
        // Find the appointment ID for this patient
        const patientAppointment = appointments.find(
            a => a.patient_id === patientId && a.weekday === selectedDay && a.visit_type === 'HB'
        );
        
        if (!patientAppointment || !patientAppointment.id) {
            setNotification('Kein passender Termin für diesen Patienten gefunden', 'error');
            return;
        }
        
        const appointmentId = patientAppointment.id;
        const currentIndex = routeOrder.indexOf(appointmentId);
        
        // If appointment not found in route order or it's already at the top, do nothing
        if (currentIndex <= 0) {
            return;
        }
        
        // Swap with the previous item
        const newOrder = [...routeOrder];
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
        
        try {
            // Update the route order in the backend
            await updateRouteOrder(route.id, newOrder);
            
            // Refresh routes data
            queryClient.invalidateQueries({ queryKey: ['routes'] });
            
            setNotification('Patientenreihenfolge aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Routenreihenfolge:', error);
            setNotification('Fehler beim Aktualisieren der Routenreihenfolge', 'error');
        }
    };
    
    // Function to handle moving a patient down in the route order
    const handleMoveDown = async (patientId: number) => {
        // Find route for this employee on the selected day
        const route = routes.find(r => 
            r.employee_id === employee.id && 
            r.weekday === selectedDay.toLowerCase()
        );
        
        if (!route || !route.id || !route.route_order) {
            setNotification('Keine Route gefunden oder keine Reihenfolge definiert', 'error');
            return;
        }
        
        // Get current route order
        let routeOrder: number[] = [];
        if (Array.isArray(route.route_order)) {
            routeOrder = [...route.route_order];
        } else {
            try {
                const parsedOrder = JSON.parse(route.route_order as unknown as string);
                if (Array.isArray(parsedOrder)) {
                    routeOrder = [...parsedOrder];
                }
            } catch (error) {
                console.error('Failed to parse route_order:', error);
                setNotification('Fehler beim Verarbeiten der Routenreihenfolge', 'error');
                return;
            }
        }
        
        // Find the appointment ID for this patient
        const patientAppointment = appointments.find(
            a => a.patient_id === patientId && a.weekday === selectedDay && a.visit_type === 'HB'
        );
        
        if (!patientAppointment || !patientAppointment.id) {
            setNotification('Kein passender Termin für diesen Patienten gefunden', 'error');
            return;
        }
        
        const appointmentId = patientAppointment.id;
        const currentIndex = routeOrder.indexOf(appointmentId);
        
        // If appointment not found in route order or it's already at the bottom, do nothing
        if (currentIndex === -1 || currentIndex >= routeOrder.length - 1) {
            return;
        }
        
        // Swap with the next item
        const newOrder = [...routeOrder];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        
        try {
            // Update the route order in the backend
            await updateRouteOrder(route.id, newOrder);
            
            // Refresh routes data
            queryClient.invalidateQueries({ queryKey: ['routes'] });
            
            setNotification('Patientenreihenfolge aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Routenreihenfolge:', error);
            setNotification('Fehler beim Aktualisieren der Routenreihenfolge', 'error');
        }
    };

    const handleMoveAllPatients = async (targetEmployeeId: number) => {
        const targetEmployee = employeesData.find(e => e.id === targetEmployeeId);
        if (!targetEmployee || !targetEmployee.tour_number) {
            setNotification('Ungültiger Mitarbeiter oder keine Tour-Nummer zugewiesen', 'error');
            return;
        }

        // Prevent assigning to the same tour
        if (employee.tour_number === targetEmployee.tour_number) {
            setNotification('Patienten sind bereits dieser Tour zugewiesen', 'error');
            return;
        }

        // Prevent assigning to a deactivated employee
        if (!targetEmployee.is_active) {
            setNotification('Der Mitarbeiter ist deaktiviert. Bitte wählen Sie einen aktiven Mitarbeiter.', 'error');
            return;
        }

        try {
            // Get all patients in this tour
            const tourPatients = patients.filter(p => p.tour === employee.tour_number);
            if (tourPatients.length === 0) {
                setNotification('Keine Patienten zum Verschieben gefunden', 'error');
                return;
            }
            
            setNotification('Verschiebe Patienten...', 'success');
            
            // Collect all patient IDs
            const patientIds = tourPatients.map(p => p.id).filter(id => id !== undefined) as number[];
            
            // Step 1: Update all patients' tour numbers in a single batch operation
            // This is a theoretical implementation - you'll need to create this API endpoint
            try {
                // Use the existing updatePatientTour function in a Promise.all to parallelize
                await Promise.all(patientIds.map(id => 
                    updatePatientTour(id, targetEmployee.tour_number!)
                ));
            } catch (error) {
                console.error('Fehler beim Aktualisieren der Patienten-Touren:', error);
                setNotification('Fehler beim Aktualisieren der Patienten-Touren', 'error');
                return;
            }
            
            // Step 2: Get all appointments for these patients in a single batch
            let allAppointments: Appointment[] = [];
            try {
                // Fetch all appointments in parallel
                const appointmentPromises = patientIds.map(id => appointmentsApi.getByPatientId(id));
                const appointmentsArrays = await Promise.all(appointmentPromises);
                
                // Flatten the arrays
                allAppointments = appointmentsArrays.flat();
            } catch (error) {
                console.error('Fehler beim Laden der Termine:', error);
                setNotification('Fehler beim Laden der Termine', 'error');
                return;
            }
            
            // Step 3: Update all appointments with the new employee ID
            try {
                // Get all appointment IDs
                const appointmentIds = allAppointments
                    .map(a => a.id)
                    .filter(id => id !== undefined) as number[];
                
                // Update all appointments in parallel
                await Promise.all(appointmentIds.map(id => 
                    updateAppointmentEmployee(id, targetEmployee.id!)
                ));
            } catch (error) {
                console.error('Fehler beim Aktualisieren der Termine:', error);
                setNotification('Fehler beim Aktualisieren der Termine', 'error');
                return;
            }
            
            // Step 4: Notify parent component about the moves
            if (onPatientMoved) {
                // Extract HB appointments for route updates
                const hbAppointments = allAppointments.filter(a => a.visit_type === 'HB');
                
                // Process each patient
                for (const patient of tourPatients) {
                    if (!patient.id) continue;
                    onPatientMoved(patient, targetEmployee.tour_number!, hbAppointments);
                }
            }
            
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['routes'] });
            
            setNotification(`Alle Patienten erfolgreich zu Tour ${targetEmployee.tour_number} verschoben`, 'success');
            handleMenuClose();
            
        } catch (error) {
            console.error('Fehler beim Verschieben der Patienten:', error);
            setNotification('Fehler beim Verschieben der Patienten', 'error');
        }
    };

    // Filter active employees with tour numbers
    const availableEmployees = employeesData
        .filter(emp => emp.is_active && 
                emp.tour_number !== undefined && 
                emp.tour_number !== null && 
                emp.tour_number !== employee.tour_number)
        .sort((a, b) => (a.tour_number || 0) - (b.tour_number || 0));

    // Get inactive employees with tour numbers
    const inactiveEmployees = employeesData
        .filter(emp => !emp.is_active && 
                emp.tour_number !== undefined && 
                emp.tour_number !== null && 
                emp.tour_number !== employee.tour_number)
        .sort((a, b) => (a.tour_number || 0) - (b.tour_number || 0));

    // Count patients in each tour
    const patientCountByTour = React.useMemo(() => {
        const counts = new Map<number, number>();
        
        // Initialize counts for all tours
        employeesData.forEach(emp => {
            if (emp.tour_number !== undefined && emp.tour_number !== null) {
                counts.set(emp.tour_number, 0);
            }
        });
        
        // Use the patients prop passed to this component
        const allPatients = queryClient.getQueryData<Patient[]>(['patients']) || patients;
        
        allPatients.forEach((p: Patient) => {
            if (p.tour !== undefined && p.tour !== null) {
                counts.set(p.tour, (counts.get(p.tour) || 0) + 1);
            }
        });
        
        return counts;
    }, [employeesData, queryClient, patients]);

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
                {showInactiveWarning && (
                    <Alert 
                        severity="warning" 
                        icon={<WarningIcon />}
                        sx={{ mb: 2 }}
                    >
                        Dieser Mitarbeiter ist deaktiviert. Bitte Patienten neu zuweisen.
                    </Alert>
                )}
                
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start' 
                }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                                variant="h6" 
                                component="h3" 
                                sx={{ 
                                    fontWeight: 'bold',
                                    color: employee.tour_number ? getColorForTour(employee.tour_number) : 'text.primary'
                                }}
                            >
                                {employee.tour_number ? `Tour ${employee.tour_number}:` : ''}
                            </Typography>
                            
                            <Typography 
                                variant="h6" 
                                component="h3" 
                                sx={{ 
                                    fontWeight: 'medium',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                {employee.first_name} {employee.last_name}
                            </Typography>
                        </Box>
                        
                        {/* Employee status and function info */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1,
                            mt: 0.5
                        }}>
                            <Tooltip title={`Funktion: ${employee.function} - ${employee.is_active ? 'Aktiv' : 'Inaktiv'}`}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {employee.is_active ? 
                                        <CheckCircle color="success" fontSize="small" /> : 
                                        <Cancel color="error" fontSize="small" />
                                    }
                                    
                                    {/* Employee function chip */}
                                    <Chip 
                                        label={employee.function}
                                        size="small"
                                        sx={{ 
                                            height: '20px',
                                            fontSize: '0.7rem',
                                            backgroundColor: employeeTypeColors[employee.function] || employeeTypeColors.default,
                                            color: 'white',
                                        }}
                                    />
                                </Box>
                            </Tooltip>
                        </Box>
                        
                        {/* Anzeige der Strecke und Gesamtzeit */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1,
                            mt: 0.5
                        }}>
                            {routeData && (
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                    {routeData.totalDistance}
                                </Typography>
                            )}
                            {routeData && routeData.timeRatio && (
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        whiteSpace: 'nowrap', 
                                        fontWeight: 'bold',
                                        color: routeData.isWithinWorkHours ? 'success.main' : 'error.main'
                                    }}
                                >
                                    {routeData.timeRatio}
                                </Typography>
                            )}
                            {expanded && employeeRoute && (
                                <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<RouteIcon />}
                                        onClick={handleOptimizeRoute}
                                        disabled={isOptimizing || tourPatients.length === 0}
                                        sx={{ 
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: 'primary.light',
                                                color: 'primary.contrastText'
                                            }
                                        }}
                                    >
                                        {isOptimizing ? 'Optimiert...' : 'Optimieren'}
                                    </Button>
                                    
                                    <Tooltip title="Alle neu zuweisen" arrow>
                                        <span>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={handleMenuOpen}
                                                disabled={tourPatients.length === 0}
                                                sx={{ 
                                                    textTransform: 'none',
                                                    minWidth: '40px',
                                                    width: '40px',
                                                    px: 0,
                                                    height: '31px',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    '&:hover': {
                                                        backgroundColor: 'primary.light',
                                                        color: 'primary.contrastText'
                                                    }
                                                }}
                                            >
                                                <SwapHorizIcon fontSize="small" />
                                            </Button>
                                        </span>
                                    </Tooltip>
                                    
                                    {/* Tour assignment menu */}
                                    <Menu
                                        anchorEl={anchorEl}
                                        open={Boolean(anchorEl)}
                                        onClose={handleMenuClose}
                                        sx={{
                                            '& .MuiPaper-root': {
                                                maxHeight: 300,
                                                overflow: 'auto',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                borderRadius: 2
                                            }
                                        }}
                                    >
                                        {/* Active employees section */}
                                        <Typography 
                                            variant="subtitle2" 
                                            sx={{ px: 2, py: 1, bgcolor: 'background.default', fontWeight: 'bold' }}
                                        >
                                            Aktive Touren
                                        </Typography>
                                        
                                        {availableEmployees.map((emp) => {
                                            const patientCount = patientCountByTour.get(emp.tour_number!) || 0;
                                            const isEmpty = patientCount === 0;
                                            
                                            return (
                                                <MenuItem 
                                                    key={emp.id}
                                                    onClick={() => emp.id && handleMoveAllPatients(emp.id)}
                                                    sx={{
                                                        py: 1,
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                        }
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <PersonIcon 
                                                            fontSize="small" 
                                                            sx={{ color: getColorForTour(emp.tour_number!) }} 
                                                        />
                                                    </ListItemIcon>
                                                    <ListItemText>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body2">
                                                                {emp.first_name} {emp.last_name}
                                                            </Typography>
                                                            <Chip
                                                                label={`Tour ${emp.tour_number}`}
                                                                size="small"
                                                                sx={{
                                                                    height: 20,
                                                                    bgcolor: getColorForTour(emp.tour_number!),
                                                                    color: 'white',
                                                                    '& .MuiChip-label': {
                                                                        px: 1,
                                                                        fontSize: '0.75rem'
                                                                    }
                                                                }}
                                                            />
                                                            {isEmpty && (
                                                                <Chip
                                                                    label="Leer"
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: '0.7rem',
                                                                        borderColor: 'warning.main',
                                                                        color: 'warning.main'
                                                                    }}
                                                                />
                                                            )}
                                                            {!isEmpty && (
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        color: 'text.secondary',
                                                                        fontSize: '0.7rem'
                                                                    }}
                                                                >
                                                                    {patientCount} {patientCount === 1 ? 'Patient' : 'Patienten'}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </ListItemText>
                                                </MenuItem>
                                            );
                                        })}
                                        
                                        {/* Show inactive employees if there are any */}
                                        {inactiveEmployees.length > 0 && (
                                            <>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography 
                                                    variant="subtitle2" 
                                                    sx={{ px: 2, py: 1, bgcolor: 'background.default', fontWeight: 'bold', color: 'error.main' }}
                                                >
                                                    Inaktive Touren
                                                </Typography>
                                                
                                                {inactiveEmployees.map((emp) => {
                                                    const patientCount = patientCountByTour.get(emp.tour_number!) || 0;
                                                    const isEmpty = patientCount === 0;
                                                    
                                                    return (
                                                        <MenuItem 
                                                            key={emp.id}
                                                            onClick={() => emp.id && handleMoveAllPatients(emp.id)}
                                                            disabled={true}
                                                            sx={{
                                                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                                opacity: 0.7,
                                                                py: 1
                                                            }}
                                                        >
                                                            <ListItemIcon>
                                                                <PersonIcon 
                                                                    fontSize="small" 
                                                                    sx={{ 
                                                                        color: 'error.main',
                                                                        opacity: 0.7
                                                                    }} 
                                                                />
                                                            </ListItemIcon>
                                                            <ListItemText>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Typography 
                                                                        variant="body2"
                                                                        sx={{ opacity: 0.7 }}
                                                                    >
                                                                        {emp.first_name} {emp.last_name}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={`Tour ${emp.tour_number}`}
                                                                        size="small"
                                                                        sx={{
                                                                            height: 20,
                                                                            bgcolor: 'error.light',
                                                                            color: 'white',
                                                                            opacity: 0.7,
                                                                            '& .MuiChip-label': {
                                                                                px: 1,
                                                                                fontSize: '0.75rem'
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Chip
                                                                        label="Inaktiv"
                                                                        size="small"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 20,
                                                                            fontSize: '0.7rem',
                                                                            borderColor: 'error.main',
                                                                            color: 'error.main'
                                                                        }}
                                                                    />
                                                                    {!isEmpty && (
                                                                        <Typography 
                                                                            variant="caption" 
                                                                            sx={{ 
                                                                                color: 'error.main',
                                                                                fontSize: '0.7rem',
                                                                                fontWeight: 'bold'
                                                                            }}
                                                                        >
                                                                            {patientCount} {patientCount === 1 ? 'Patient' : 'Patienten'}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </ListItemText>
                                                        </MenuItem>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </Menu>
                                </Box>
                            )}
                        </Box>
                    </Box>
                    
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
                        {/* Text für Gesamtanzahl der Patienten */}
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            {tourPatients.length} Patienten
                        </Typography>
                        
                        {/* Icons für die verschiedenen Besuchstypen */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
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
                                                onPatientMoved={onPatientMoved}
                                                onMoveUp={handleMoveUp}
                                                onMoveDown={handleMoveDown}
                                                isFirst={index === 0}
                                                isLast={index === sortedHbPatients.length - 1}
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
                                                        onPatientMoved={onPatientMoved}
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
                                                        onPatientMoved={onPatientMoved}
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
                                                        onPatientMoved={onPatientMoved}
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
        </>
    );
}; 