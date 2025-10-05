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
import { getColorForTour, employeeTypeColors } from '../../utils/colors';
import { useAppointmentsByPatient } from '../../services/queries/useAppointments';
import WeekdayOverview from './WeekdayOverview';
import { useAppointmentManagement } from '../../hooks';
import { ReplacementConfirmationDialog } from './MoveConfirmationDialog';

interface PatientCardProps {
    patient: Patient;
    appointments: Appointment[];
    visitType: 'HB' | 'NA' | 'TK' | 'none';
    index?: number;  // For numbered list of HB visits
    compact?: boolean; // For more compact display in TK, NA, and no-appointment sections
    selectedDay: Weekday; // Der ausgewählte Wochentag
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
    onMoveUp,
    onMoveDown,
    isFirst = false,
    isLast = false
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [replacementDialog, setReplacementDialog] = useState<{
        open: boolean;
        appointmentId?: number;
        sourceEmployeeId?: number;
        targetEmployeeId?: number;
        replacementEmployee?: any;
    }>({ open: false });
    const { data: employees = [] } = useEmployees();
    const { data: patientAppointments = [], isLoading, error } = useAppointmentsByPatient(patient.id ?? 0);
    
    // Custom hook for appointment management
    const appointmentManagement = useAppointmentManagement({
        selectedDay
    });
    
    // Get current employee ID from the selected day appointment
    const selectedDayAppointment = patientAppointments.find(app => app.weekday === selectedDay);
    const currentEmployeeId = selectedDayAppointment?.employee_id;

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
            appointmentIds: appointments
                .filter(app => app.weekday === selectedDay)
                .map(a => a.id || 0)
                .filter(id => id !== 0),
            sourceEmployeeId: (() => {
                // Get source employee ID from the selected day appointment
                const selectedDayAppointment = appointments.find(app => app.weekday === selectedDay);
                return selectedDayAppointment?.employee_id || undefined;
            })()
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

    const handleAssignEmployee = async (employeeId: number) => {
        const targetEmployee = employees.find(e => e.id === employeeId);
        if (!targetEmployee) {
            return;
        }

        // Find the appointment for the selected day
        const selectedDayAppointment = patientAppointments.find(app => app.weekday === selectedDay);
        if (!selectedDayAppointment) {
            return;
        }

        // Get current employee ID from the selected day appointment
        const currentEmployeeId = selectedDayAppointment.employee_id;
        if (!currentEmployeeId) {
            return;
        }

        const appointmentId = selectedDayAppointment.id;
        if (typeof appointmentId !== 'number') {
            return;
        }

        try {
            // Check if target employee has a replacement
            const replacementInfo = await appointmentManagement.checkReplacement(
                employeeId, 
                selectedDay.toLowerCase()
            );

            if (replacementInfo.has_replacement) {
                // Show dialog to ask user
                setReplacementDialog({
                    open: true,
                    appointmentId,
                    sourceEmployeeId: currentEmployeeId,
                    targetEmployeeId: employeeId,
                    replacementEmployee: replacementInfo.replacement_employee
                });
            } else {
                // No replacement, move directly
                await appointmentManagement.moveAppointment({
                    appointmentId,
                    sourceEmployeeId: currentEmployeeId,
                    targetEmployeeId: employeeId,
                    respectReplacement: false
                });
            }
        } catch (error) {
            console.error('Fehler beim Prüfen der Vertretung:', error);
            // Fallback: move directly without checking replacement
            await appointmentManagement.moveAppointment({
                appointmentId,
                sourceEmployeeId: currentEmployeeId,
                targetEmployeeId: employeeId,
                respectReplacement: false
            });
        }
        
        handleMenuClose();
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

    const handleReplacementDialogClose = () => {
        setReplacementDialog({ open: false });
    };

    const handleReplacementDialogConfirm = async (respectReplacement: boolean) => {
        if (replacementDialog.appointmentId && replacementDialog.sourceEmployeeId && replacementDialog.targetEmployeeId) {
            await appointmentManagement.moveAppointment({
                appointmentId: replacementDialog.appointmentId,
                sourceEmployeeId: replacementDialog.sourceEmployeeId,
                targetEmployeeId: replacementDialog.targetEmployeeId,
                respectReplacement
            });
        }
    };

    // Filter and sort employees like in ReplacementMenu
    const availableEmployees = React.useMemo(() => {
        const functionPriority: Record<string, number> = {
            'Pflegekraft': 1,
            'PDL': 2,
            'Physiotherapie': 3,
            'Arzt': 4,
            'Honorararzt': 5,
        };

        return employees
            .filter(emp => emp.id !== currentEmployeeId) // Filter out current employee
            .sort((a, b) => {
                // First sort by function priority
                const aPriority = functionPriority[a.function] || 999;
                const bPriority = functionPriority[b.function] || 999;
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                // Then sort by last name, then first name
                const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
                const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
                
                return aName.localeCompare(bName);
            });
    }, [employees, currentEmployeeId]);

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
                
                {/* Separator line when at least one arrow is visible */}
                {(onMoveUp || onMoveDown) && (
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
                    const menuItem = (
                        <MenuItem 
                            key={employee.id}
                            onClick={() => employee.id && handleAssignEmployee(employee.id)}
                            sx={{
                                py: 1,
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                }
                            }}
                        >
                            <ListItemText>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={`${employee.first_name} ${employee.last_name}`}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            bgcolor: getColorForTour(employee.id),
                                            color: 'white',
                                            '& .MuiChip-label': {
                                                px: 1,
                                                fontSize: '0.75rem'
                                            }
                                        }}
                                    />
                                    <Chip
                                        label={employee.function}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.7rem',
                                            borderColor: employeeTypeColors[employee.function] || employeeTypeColors.default,
                                            color: employeeTypeColors[employee.function] || employeeTypeColors.default,
                                            '& .MuiChip-label': {
                                                px: 1,
                                                fontSize: '0.7rem'
                                            }
                                        }}
                                    />
                                </Box>
                            </ListItemText>
                        </MenuItem>
                    );
                    return menuItem;
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
                        {patientAppointments.find(a => a.weekday === selectedDay)?.info && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {patientAppointments.find(a => a.weekday === selectedDay)?.info}
                                </Typography>
                            </Box>
                        )}
                        
                        {/* Wochentagsübersicht */}
                        <WeekdayOverview
                            appointments={patientAppointments}
                            selectedDay={selectedDay}
                            employees={employees}
                        />
                    </Box>
                </Box>
            </CardContent>
            
            <ReplacementConfirmationDialog
                open={replacementDialog.open}
                onClose={handleReplacementDialogClose}
                onConfirm={handleReplacementDialogConfirm}
                sourceEmployee={employees.find(e => e.id === replacementDialog.sourceEmployeeId) || employees[0]}
                targetEmployee={employees.find(e => e.id === replacementDialog.targetEmployeeId) || employees[0]}
                replacementEmployee={replacementDialog.replacementEmployee}
                patientName={`${patient.first_name} ${patient.last_name}`}
                weekday={selectedDay}
            />
        </Card>
    );
}; 