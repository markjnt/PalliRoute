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
    Route as RouteIcon,
    SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { useDrop } from 'react-dnd';
import { Patient, Appointment, Weekday, Employee, Route } from '../../types/models';
import { PatientCard } from './PatientCard';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '../../services/queries/useEmployees';
import { useBatchMoveAppointments, useMoveAppointment } from '../../services/queries/useAppointments';
import { useReorderAppointment, useOptimizeRoutes } from '../../services/queries/useRoutes';
import { getColorForTour, employeeTypeColors } from '../../utils/colors';

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
        mb: 2,
        color: color
    }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>
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
}

interface DropState {
    isOver: boolean;
    canDrop: boolean;
}

interface MenuState {
    open: boolean;
    anchorEl: HTMLElement | null;
}

interface OptimizeState {
    isOptimizing: boolean;
}

export const TourContainer: React.FC<TourContainerProps> = ({
    employee,
    patients,
    appointments,
    selectedDay,
    routes
}) => {
    const [expanded, setExpanded] = useState(false);
    const [menuState, setMenuState] = useState<MenuState>({
        open: false,
        anchorEl: null
    });
    const [optimizeState, setOptimizeState] = useState<OptimizeState>({
        isOptimizing: false
    });
    const { setNotification } = useNotificationStore();
    const queryClient = useQueryClient();
    const optimizeRoutes = useOptimizeRoutes();
    const { data: employeesData = [] } = useEmployees();
    const batchMoveAppointments = useBatchMoveAppointments();
    const moveAppointment = useMoveAppointment();
    const reorderAppointment = useReorderAppointment();
    const dropRef = useRef<HTMLDivElement>(null);

    const [{ isOver, canDrop }, drop] = useDrop<PatientDragItem, void, DropState>({
        accept: DragItemTypes.PATIENT,
        drop: (item) => {
            if (item.sourceTourNumber === employee.tour_number) {
                return;
            }

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

                // Move all appointments for this patient (nur die des aktuellen Patienten)
                for (const apptId of item.appointmentIds) {
                    moveAppointment.mutate({
                        appointmentId: apptId,
                        sourceEmployeeId: item.sourceTourNumber || 0,
                        targetEmployeeId: employee.id || 0
                    });
                }


                setNotification(`Patient erfolgreich zu Tour ${employee.tour_number} verschoben`, 'success');
            } catch (error) {
                console.error('Fehler beim Verschieben des Patienten:', error);
                setNotification('Fehler beim Verschieben des Patienten', 'error');
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop()
        })
    });

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

    const handleOptimizeRoute = async () => {
        try {
            setOptimizeState({ isOptimizing: true });
            await optimizeRoutes.mutateAsync({
                weekday: selectedDay.toLowerCase(),
                employeeId: employee.id || 0
            });
            setNotification('Route erfolgreich optimiert', 'success');
        } catch (error) {
            console.error('Fehler beim Optimieren der Route:', error);
            setNotification('Fehler beim Optimieren der Route', 'error');
        } finally {
            setOptimizeState({ isOptimizing: false });
            handleMenuClose();
        }
    };

    const handleMoveAllPatients = async (targetEmployeeId: number) => {
        try {
            await batchMoveAppointments.mutateAsync({
                sourceEmployeeId: employee.id || 0,
                targetEmployeeId
            });
            
            handleMenuClose();
            setNotification('Alle Patienten erfolgreich verschoben', 'success');
        } catch (error) {
            console.error('Fehler beim Verschieben aller Patienten:', error);
            setNotification('Fehler beim Verschieben aller Patienten', 'error');
        }
    };

    const handleMoveUp = (patientId: number) => {
        // Find the route for this employee and day
        const route = routes.find(r => 
            r.employee_id === employee.id && 
            r.weekday === selectedDay.toLowerCase()
        );
        
        if (!route || !route.id) return;
        
        // Find the appointment for this patient
        const appointment = appointments.find(a => a.patient_id === patientId && a.employee_id === employee.id);
        if (!appointment || !appointment.id) return;
        
        // Call the reorder mutation
        reorderAppointment.mutate({
            routeId: route.id,
            appointmentId: appointment.id,
            direction: 'up'
        });
    };

    const handleMoveDown = (patientId: number) => {
        // Find the route for this employee and day
        const route = routes.find(r => 
            r.employee_id === employee.id && 
            r.weekday === selectedDay.toLowerCase()
        );
        
        if (!route || !route.id) return;
        
        // Find the appointment for this patient
        const appointment = appointments.find(a => a.patient_id === patientId && a.employee_id === employee.id);
        if (!appointment || !appointment.id) return;
        
        // Call the reorder mutation
        reorderAppointment.mutate({
            routeId: route.id,
            appointmentId: appointment.id,
            direction: 'down'
        });
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

    return (
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
                        {expanded && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RouteIcon />}
                                    onClick={handleOptimizeRoute}
                                    disabled={optimizeState.isOptimizing || tourPatients.length === 0}
                                    sx={{ 
                                        textTransform: 'none',
                                        '&:hover': {
                                            backgroundColor: 'primary.light',
                                            color: 'primary.contrastText'
                                        }
                                    }}
                                >
                                    {optimizeState.isOptimizing ? 'Optimiert...' : 'Optimieren'}
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
                                    anchorEl={menuState.anchorEl}
                                    open={menuState.open}
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
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                        title="Ohne Besuch" 
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
    );
}; 