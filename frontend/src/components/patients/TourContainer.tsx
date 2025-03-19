import React, { useState, useRef } from 'react';
import { 
    Box, 
    Typography, 
    Paper,
    Divider,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Collapse,
    Chip,
    Alert,
    Snackbar
} from '@mui/material';
import { 
    Home as HomeIcon,
    Nightlight as NightIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AddCircle as AddCircleIcon
} from '@mui/icons-material';
import { useDrop } from 'react-dnd';
import { Patient, Appointment, Weekday, Employee } from '../../types/models';
import { PatientCard } from './PatientCard';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { useDrag } from '../../contexts/DragContext';

interface TourContainerProps {
    employee: Employee;
    patients: Patient[];
    appointments: Appointment[];
    selectedDay: Weekday;
    onPatientMoved?: (patient: Patient, newTourNumber: number) => void;
}

export const TourContainer: React.FC<TourContainerProps> = ({
    employee,
    patients,
    appointments,
    selectedDay,
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

    // Toggle für expanded state
    const toggleExpand = () => {
        setExpanded(!expanded);
    };
    
    // Configure drop functionality
    const [{ isOver, canDrop }, drop] = useDrop<PatientDragItem, unknown, { isOver: boolean; canDrop: boolean }>({
        accept: DragItemTypes.PATIENT,
        drop: async (item) => {
            // Don't do anything if dropped in the same tour
            if (item.sourceTourNumber === employee.tour_number) {
                return;
            }
            
            try {
                // Update the patient's tour
                await updatePatientTour(item.patientId, employee.tour_number);
                
                // Update all appointments for the selected day to the new employee
                for (const appointmentId of item.appointmentIds) {
                    await updateAppointmentEmployee(appointmentId, employee.id);
                }
                
                // Show success notification
                setNotification({
                    open: true,
                    message: `Patient erfolgreich zu Tour ${employee.tour_number} verschoben`,
                    severity: 'success'
                });
                
                // Notify parent component if needed
                const patient = patients.find(p => p.id === item.patientId);
                if (patient && onPatientMoved) {
                    onPatientMoved(patient, employee.tour_number || 0);
                }
            } catch (err) {
                console.error('Error moving patient:', err);
                // Show error notification
                setNotification({
                    open: true,
                    message: error || 'Fehler beim Verschieben des Patienten',
                    severity: 'error'
                });
            }
        },
        canDrop: (item) => item.sourceTourNumber !== employee.tour_number, // Only allow dropping in a different tour
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop()
        })
    });
    
    // Apply the drop ref to our container
    drop(dropRef);

    // Filter to only include patients for this employee's tour
    const tourPatients = patients.filter(p => p.tour === employee.tour_number);
    
    // Filter appointments for the selected day and this tour's patients
    const tourPatientIds = tourPatients.map(p => p.id).filter((id): id is number => id !== undefined);
    
    // Die Termine sind bereits nach Wochentag gefiltert (appointments enthält nur Termine für den ausgewählten Tag)
    // Wir müssen nur noch nach den Patienten dieser Tour filtern
    const tourAppointments = appointments.filter(a => tourPatientIds.includes(a.patient_id));
    
    // Get all patient IDs that have appointments on this day
    const patientIdsWithAppointments = tourAppointments.map(a => a.patient_id);
    
    // Group patients by their appointment types for this tour
    const getFilteredPatients = (visitType: 'HB' | 'NA' | 'TK') => {
        // Find patient IDs with the specific visit type
        const patientIds = tourAppointments
            .filter(a => a.visit_type === visitType)
            .map(a => a.patient_id);
        
        // Return patients in this tour with the specified visit type
        return tourPatients.filter(p => p.id !== undefined && patientIds.includes(p.id));
    };
    
    // Find patients in this tour with no appointments on the selected day
    const getPatientsWithNoAppointments = () => {
        // Return patients from this tour that don't have appointments on the selected day
        return tourPatients.filter(p => p.id !== undefined && !patientIdsWithAppointments.includes(p.id));
    };
    
    // Get appointments for a specific patient and day
    const getPatientAppointments = (patientId: number) => {
        return tourAppointments.filter(a => a.patient_id === patientId);
    };
    
    const hbPatients = getFilteredPatients('HB');
    const tkPatients = getFilteredPatients('TK');
    const naPatients = getFilteredPatients('NA');
    const noAppointmentPatients = getPatientsWithNoAppointments();
    
    // Sort HB patients by time if available
    const sortedHbPatients = [...hbPatients].sort((a, b) => {
        const aAppts = getPatientAppointments(a.id || 0);
        const bAppts = getPatientAppointments(b.id || 0);
        
        const aTime = aAppts[0]?.time || '';
        const bTime = bAppts[0]?.time || '';
        
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        
        return aTime.localeCompare(bTime);
    });
    
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
    const hasAppointmentsForDay = hbPatients.length > 0 || tkPatients.length > 0 || naPatients.length > 0;
    
    // Zusammenfassung für den eingeklappten Zustand
    const patientSummary = `${tourPatients.length} Patienten${hasAppointmentsForDay ? `: ${hbPatients.length} Hausbesuche, ${tkPatients.length} Telefonkontakte, ${naPatients.length} Neuaufnahmen` : ', keine Termine heute'}`;
    
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
            borderColor: employee.tour_number ? 'primary.main' : 'grey.400',
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
                            color: employee.tour_number ? 'primary.main' : 'text.primary'
                        }}
                    >
                        {getTourTitle()}
                    </Typography>
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
                        </>
                    ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Keine Termine für diesen Tag geplant.
                        </Alert>
                    )}
                    
                    {/* Patients with no appointments for the selected day */}
                    {noAppointmentPatients.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1" component="h4" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                Patienten ohne Termin an diesem Tag ({noAppointmentPatients.length})
                            </Typography>
                            
                            <List dense disablePadding sx={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 1,
                                '& > *': {
                                    flexBasis: {
                                        xs: '100%',
                                        sm: 'calc(50% - 8px)',
                                        md: 'calc(33.33% - 8px)',
                                        lg: 'calc(25% - 8px)'
                                    },
                                    minWidth: {
                                        xs: '100%',
                                        sm: '250px'
                                    }
                                }
                            }}>
                                {noAppointmentPatients.map((patient) => (
                                    <ListItem 
                                        key={`no-appt-${patient.id}`} 
                                        disablePadding 
                                    >
                                        <PatientCard
                                            patient={patient}
                                            appointments={[]}
                                            visitType="none"
                                            compact
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
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