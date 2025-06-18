import React, { useRef, useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Chip,
    Grid,
    Tooltip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import { 
    Phone as PhoneIcon,
    Home as HomeIcon,
    Info as InfoIcon,
    Navigation as NavigationIcon,
    SwapHoriz as SwapHorizIcon,
    Person as PersonIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { useDrag } from 'react-dnd';
import { Patient, Appointment, Weekday} from '../../types/models';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { useEmployees } from '../../services/queries/useEmployees';
import { getColorForTour } from '../../utils/colors';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useMoveAppointment, useAppointmentsByPatient } from '../../services/queries/useAppointments';

interface PatientCardProps {
    patient: Patient;
    appointments: Appointment[];
    visitType: 'HB' | 'NA' | 'TK' | 'none';
    index?: number;  // For numbered list of HB visits
    compact?: boolean; // For more compact display in TK, NA, and no-appointment sections
    selectedDay: Weekday; // Der ausgewählte Wochentag
    onPatientMoved?: (patient: Patient, newTourNumber: number, hbAppointments?: Appointment[]) => void;
    onMoveUp?: (patientId: number) => void; // New prop for moving patient up
    onMoveDown?: (patientId: number) => void; // New prop for moving patient down
    isFirst?: boolean; // New prop to indicate if this is the first patient in the list
    isLast?: boolean; // New prop to indicate if this is the last patient in the list
}

export const PatientCard: React.FC<PatientCardProps> = ({ 
    patient, 
    appointments,
    visitType,
    index,
    compact = false,
    selectedDay,
    onPatientMoved,
    onMoveUp,
    onMoveDown,
    isFirst = false,
    isLast = false
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { data: employees = [] } = useEmployees();
    const { setNotification } = useNotificationStore();
    const moveAppointment = useMoveAppointment();
    const { data: patientAppointments = [], isLoading, error } = useAppointmentsByPatient(patient.id ?? 0);
    
    // Get current employee ID from appointments
    const currentEmployeeId = patientAppointments[0]?.employee_id;

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    
    // Configure drag and drop
    const [{ isDragging }, drag] = useDrag<PatientDragItem, unknown, { isDragging: boolean }>({
        type: DragItemTypes.PATIENT,
        item: {
            type: DragItemTypes.PATIENT,
            patientId: patient.id || 0,
            appointmentIds: appointments.map(a => a.id || 0).filter(id => id !== 0),
            sourceTourNumber: patient.tour
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        canDrag: () => !!patient.id // Only allow dragging if patient has an ID
    });
    
    // Connect the drag ref to our cardRef
    drag(cardRef);

    const getBgColor = () => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.08)'; // Light blue
            case 'NA': return 'rgba(156, 39, 176, 0.08)'; // Light purple
            case 'TK': return 'rgba(76, 175, 80, 0.08)';  // Light green
            default: return 'rgba(158, 158, 158, 0.08)';  // Light gray with same opacity as others
        }
    };

    // Erstelle ein Mapping für alle Termine des Patienten nach Wochentag
    const allWeekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    
    // Funktion zum Abrufen des Besuchstyps für einen bestimmten Wochentag
    const getVisitTypeForWeekday = (weekday: Weekday): string | null => {
        const appt = patientAppointments.find(a => a.weekday === weekday);
        return appt?.visit_type || null;
    };
    
    // Funktion zum Abrufen der Info für einen bestimmten Wochentag
    const getInfoForWeekday = (weekday: Weekday): string | null => {
        const appt = patientAppointments.find(a => a.weekday === weekday);
        return appt?.info || null;
    };
    
    // Funktion zum Übersetzen des englischen Wochentags in Deutsch
    const getGermanWeekday = (weekday: Weekday): string => {
        switch (weekday) {
            case 'monday': return 'Montag';
            case 'tuesday': return 'Dienstag';
            case 'wednesday': return 'Mittwoch';
            case 'thursday': return 'Donnerstag';
            case 'friday': return 'Freitag';
            default: return weekday; // Fallback
        }
    };
    
    // Funktion zum Erzeugen einer Stilfarbe basierend auf dem Besuchstyp
    const getVisitTypeColor = (visitType: string | null): string => {
        switch (visitType) {
            case 'HB': return 'primary.main';  // Blau
            case 'TK': return 'success.main';  // Grün
            case 'NA': return 'secondary.main'; // Lila
            default: return 'text.disabled';    // Grau für leere Felder
        }
    };
    
    // Funktion zum Erzeugen einer Stilfarbe für den Hintergrund basierend auf dem Besuchstyp
    const getVisitTypeBgColor = (visitType: string | null): string => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.1)';  // Helles Blau
            case 'TK': return 'rgba(76, 175, 80, 0.1)';   // Helles Grün
            case 'NA': return 'rgba(156, 39, 176, 0.1)';  // Helles Lila
            default: return 'transparent';                // Transparent für leere Felder
        }
    };
    
    // Komponente für die Wochentagsübersicht
    const WeekdayOverview = () => (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Grid container spacing={0.5} sx={{ width: '100%' }}>
                {allWeekdays.map((weekday, idx) => {
                    const visit = getVisitTypeForWeekday(weekday);
                    const isSelectedDay = weekday === selectedDay;
                    return (
                        <Grid size="grow" key={weekday} sx={{ width: 'calc(100% / 7)' }}>
                            <Tooltip title={`${getGermanWeekday(weekday)}: ${visit || 'Kein Besuch'}`}>
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        p: 0.5,
                                        borderRadius: 1,
                                        bgcolor: isSelectedDay 
                                            ? visit ? getVisitTypeBgColor(visit) : 'rgba(0, 0, 0, 0.04)'
                                            : 'transparent',
                                        border: '1px solid',
                                        borderColor: visit ? getVisitTypeColor(visit) : 'divider',
                                    }}
                                >
                                    <Typography 
                                        variant="caption" 
                                        fontWeight="bold" 
                                        color="text.secondary"
                                    >
                                        {weekdayLabels[idx]}
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        fontWeight={visit ? 'bold' : 'normal'}
                                        color={getVisitTypeColor(visit)}
                                    >
                                        {visit || '–'}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );

    const handleAssignEmployee = async (employeeId: number) => {
        try {
            const targetEmployee = employees.find(e => e.id === employeeId);
            if (!targetEmployee || !targetEmployee.tour_number) {
                setNotification('Ungültiger Mitarbeiter oder keine Tour-Nummer zugewiesen', 'error');
                return;
            }

            // Prevent assigning to a deactivated employee
            if (!targetEmployee.is_active) {
                setNotification('Der Mitarbeiter ist deaktiviert. Bitte wählen Sie einen aktiven Mitarbeiter.', 'error');
                return;
            }

            // Get current employee ID from appointments
            const currentEmployeeId = patientAppointments[0]?.employee_id;
            if (!currentEmployeeId) {
                setNotification('Kein aktueller Mitarbeiter gefunden', 'error');
                return;
            }

            // Move all appointments for this patient
            for (const appt of patientAppointments) {
                if (appt.id) {
                    await moveAppointment.mutateAsync({
                        appointmentId: appt.id,
                        sourceEmployeeId: currentEmployeeId,
                        targetEmployeeId: employeeId
                    });
                }
            }
            
            // Update patient tour
            if (onPatientMoved) {
                onPatientMoved(patient, targetEmployee.tour_number, patientAppointments.filter(a => a.visit_type === 'HB'));
            }
            
            handleMenuClose();
            setNotification('Patient erfolgreich zugewiesen', 'success');
        } catch (error) {
            console.error('Fehler beim Zuweisen des Patienten:', error);
            setNotification('Fehler beim Zuweisen des Patienten', 'error');
        }
    };

    // Handle move up/down actions
    const handleMoveUp = () => {
        if (onMoveUp && patient.id && !isFirst) {
            onMoveUp(patient.id);
        }
    };

    const handleMoveDown = () => {
        if (onMoveDown && patient.id && !isLast) {
            onMoveDown(patient.id);
        }
    };

    // Filter active employees with tour numbers
    const availableEmployees = employees
        .filter(emp => emp.is_active && emp.tour_number !== undefined && emp.tour_number !== null)
        .sort((a, b) => (a.tour_number || 0) - (b.tour_number || 0));

    return (
        <Card 
            ref={cardRef}
            variant="outlined" 
            sx={{ 
                mb: 2,
                backgroundColor: getBgColor(),
                position: 'relative',
                width: '100%',
                opacity: isDragging ? 0.5 : 1,
                cursor: 'grab',
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: 2,
                    transform: 'translateY(-2px)'
                }
            }}
        >
            {/* Reordering arrows */}
            <Box sx={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px', 
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                borderRadius: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                {/* Up arrow - hidden for first patient */}
                {!isFirst && onMoveUp && (
                    <Tooltip title="Nach oben verschieben" arrow placement="top">
                        <IconButton
                            size="small"
                            onClick={handleMoveUp}
                            sx={{ 
                                color: 'text.secondary',
                                width: 24,
                                height: 24,
                                minWidth: 24,
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                
                {/* Down arrow - hidden for last patient */}
                {!isLast && onMoveDown && (
                    <Tooltip title="Nach unten verschieben" arrow placement="top">
                        <IconButton
                            size="small"
                            onClick={handleMoveDown}
                            sx={{ 
                                color: 'text.secondary',
                                width: 24,
                                height: 24,
                                minWidth: 24,
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                
                {/* Separator line when both arrows are visible */}
                {!isFirst && !isLast && (
                    <Divider orientation="vertical" flexItem sx={{ height: 16, my: 'auto' }} />
                )}
                
                {/* Assign button that opens menu */}
                <Tooltip title="Tour zuweisen" arrow placement="top">
                    <IconButton
                        size="small"
                        onClick={handleMenuOpen}
                        aria-label="Zuweisen"
                        sx={{ 
                            color: 'text.secondary',
                            width: 24,
                            height: 24,
                            minWidth: 24,
                            '&:hover': {
                                backgroundColor: 'transparent',
                                color: 'primary.main'
                            }
                        }}
                    >
                        <SwapHorizIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
            
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
                {availableEmployees.map((employee) => {
                    const isCurrentEmployee = employee.id === currentEmployeeId;
                    return (
                        <MenuItem 
                            key={employee.id}
                            onClick={() => employee.id && handleAssignEmployee(employee.id)}
                            disabled={isCurrentEmployee}
                            sx={{
                                backgroundColor: isCurrentEmployee ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                                opacity: isCurrentEmployee ? 0.7 : 1,
                                py: 1,
                                '&:hover': {
                                    backgroundColor: isCurrentEmployee ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.04)'
                                }
                            }}
                        >
                            <ListItemIcon>
                                <PersonIcon 
                                    fontSize="small" 
                                    sx={{ 
                                        color: getColorForTour(employee.tour_number!),
                                        opacity: isCurrentEmployee ? 0.7 : 1
                                    }} 
                                />
                            </ListItemIcon>
                            <ListItemText>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography 
                                        variant="body2"
                                        sx={{
                                            opacity: isCurrentEmployee ? 0.7 : 1
                                        }}
                                    >
                                        {employee.first_name} {employee.last_name}
                                    </Typography>
                                    <Chip
                                        label={`Tour ${employee.tour_number}`}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            bgcolor: getColorForTour(employee.tour_number!),
                                            color: 'white',
                                            opacity: isCurrentEmployee ? 0.7 : 1,
                                            '& .MuiChip-label': {
                                                px: 1,
                                                fontSize: '0.75rem'
                                            }
                                        }}
                                    />
                                </Box>
                            </ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
            
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start'
                }}>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            {index !== undefined && (
                                <Box sx={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    mr: 1,
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    {index}
                                </Box>
                            )}
                            <Typography 
                                variant="h6" 
                                component="div" 
                                fontWeight="bold"
                                sx={{ 
                                    lineHeight: 1.2,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {patient.last_name}, {patient.first_name}
                            </Typography>
                        </Box>
                        
                        {patient.area && (
                            <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
                                <Tooltip title={patient.area}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <NavigationIcon 
                                            fontSize="small" 
                                            sx={{ 
                                                mr: 0.5, 
                                                color: 'text.secondary',
                                                transform: patient.area.includes('Nordkreis') ? 'rotate(0deg)' : 'rotate(180deg)'
                                            }} 
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            {patient.area.includes('Nordkreis') ? 'N' : 'S'}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            </Box>
                        )}
                        
                        {/* Adresse immer mit Haussymbol anzeigen */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <HomeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {patient.street}, {patient.zip_code} {patient.city}
                            </Typography>
                        </Box>
                        
                        {patient.phone1 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {patient.phone1}
                                </Typography>
                            </Box>
                        )}
                        
                        {/* Info für den ausgewählten Tag anzeigen */}
                        {getInfoForWeekday(selectedDay) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {getInfoForWeekday(selectedDay)}
                                </Typography>
                            </Box>
                        )}
                        
                        {/* Wochentagsübersicht */}
                        <WeekdayOverview />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}; 