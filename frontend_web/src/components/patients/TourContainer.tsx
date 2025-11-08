import React, { useState, useRef, useCallback } from 'react';
import { 
    Box, 
    Paper,
    Divider,
    IconButton,
    Collapse,
    Alert
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useDrop } from 'react-dnd';
import { Patient, Appointment, Weekday, Employee, Route } from '../../types/models';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { getColorForTour } from '../../utils/colors';
import TourSections from './TourSections';
import { TourHeader } from './tour/TourHeader';
import { TourStats } from './tour/TourStats';
import { TourControls } from './tour/TourControls';
import { TourSummary } from './tour/TourSummary';
import { ReplacementConfirmationDialog } from './MoveConfirmationDialog';
import { 
    usePatientManagement, 
    useRouteManagement, 
    useAppointmentManagement, 
    useEmployeeManagement,
    useRouteVisibility 
} from '../../hooks';


interface TourContainerProps {
    employee: Employee;
    employees: Employee[];
    patients: Patient[];
    appointments: Appointment[];
    selectedDay: Weekday;
    routes: Route[];
}

interface DropState {
    isOver: boolean;
    canDrop: boolean;
}

interface ReplacementDialogState {
    open: boolean;
    appointmentId?: number;
    sourceEmployeeId?: number;
    targetEmployeeId?: number;
    patientName?: string;
    replacementEmployee?: any;
}



export const TourContainer: React.FC<TourContainerProps> = ({
    employee,
    employees,
    patients,
    appointments,
    selectedDay,
    routes
}) => {
    const [expanded, setExpanded] = useState(false);
    const [replacementDialog, setReplacementDialog] = useState<ReplacementDialogState>({
        open: false
    });
    const dropRef = useRef<HTMLDivElement>(null);

    // Custom hooks for business logic
    const patientManagement = usePatientManagement({
        patients,
        appointments,
        selectedDay,
        employeeId: employee.id
    });

    const routeManagement = useRouteManagement({
        selectedDay,
        employeeId: employee.id
    });

    const appointmentManagement = useAppointmentManagement({
        selectedDay
    });

    const employeeManagement = useEmployeeManagement({
        employees,
        appointments,
        selectedDay
    });

    const routeVisibility = useRouteVisibility({
        routeId: routes.find(r => r.employee_id === employee.id && r.weekday === selectedDay.toLowerCase())?.id
    });

    // Find the route for this employee and day
    const route = routes.find(r => r.employee_id === employee.id && r.weekday === selectedDay.toLowerCase());
    const routeId = route?.id;
    const isVisible = routeVisibility.isVisible;

    // Get patients using custom hook
    const {
        hbPatients,
        tkPatients,
        naPatients,
        emptyTypePatients,
        tourEmployeePatients,
        normalTkPatients,
        tourEmployeeTkPatients,
        getSortedRoutePatients,
        getPatientAppointments,
        isTourEmployeeAppointment,
        hasAppointmentsForDay
    } = patientManagement;

    const sortedRoutePatients = getSortedRoutePatients(route);

    const handleDropPatient = async (item: PatientDragItem) => {
        const patientId = item.patientId;
        const patient = patients.find(p => p.id === patientId);
        
        if (!patient) {
            console.error(`Patient mit ID ${patientId} nicht gefunden`);
            return;
        }

        if (item.appointmentIds.length === 0) {
            return;
        }

        if (!item.sourceEmployeeId) {
            return;
        }

        const appointmentId = item.appointmentIds[0];
        const targetEmployeeId = employee.id || 0;

        try {
            // Check if target employee has a replacement
            const replacementInfo = await appointmentManagement.checkReplacement(
                targetEmployeeId, 
                selectedDay.toLowerCase()
            );

            if (replacementInfo.has_replacement) {
                // Show dialog to ask user
                setReplacementDialog({
                    open: true,
                    appointmentId,
                    sourceEmployeeId: item.sourceEmployeeId,
                    targetEmployeeId,
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    replacementEmployee: replacementInfo.replacement_employee
                });
            } else {
                // No replacement, move directly
                await appointmentManagement.moveAppointment({
                    appointmentId,
                    sourceEmployeeId: item.sourceEmployeeId,
                    targetEmployeeId,
                    respectReplacement: false
                });
            }
        } catch (error) {
            console.error('Fehler beim Prüfen der Vertretung:', error);
            // Fallback: move directly without checking replacement
            await appointmentManagement.moveAppointment({
                appointmentId,
                sourceEmployeeId: item.sourceEmployeeId,
                targetEmployeeId,
                respectReplacement: false
            });
        }
    };

    const [{ isOver, canDrop }, drop] = useDrop<PatientDragItem, void, DropState>({
        accept: DragItemTypes.PATIENT,
        drop: (item) => {
            handleDropPatient(item);
        },
        canDrop: (item) => {
            // Drop auf eigenen Mitarbeiter verhindern
            return item.sourceEmployeeId !== employee.id;
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop()
        })
    });

    const handleOptimizeRoute = async () => {
        await routeManagement.optimizeRoute();
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

    const handleMoveUp = async (patientId: number) => {
        if (!routeId) return;
        
        const appointment = appointments.find(a => a.patient_id === patientId && a.employee_id === employee.id);
        if (!appointment || !appointment.id) return;
        
        await routeManagement.movePatientUp(routeId, appointment.id);
    };

    const handleMoveDown = async (patientId: number) => {
        if (!routeId) return;
        
        const appointment = appointments.find(a => a.patient_id === patientId && a.employee_id === employee.id);
        if (!appointment || !appointment.id) return;
        
        await routeManagement.movePatientDown(routeId, appointment.id);
    };

    
    // Define the border style based on drag and drop state
    const getBorderStyle = () => {
        const tourColor = employee.id ? getColorForTour(employee.id) : '#9E9E9E';
        
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
                borderStyle: 'solid',
                borderWidth: 2
            };
        }
        return {
            borderWidth: 2.5,
            borderColor: tourColor,
            borderStyle: 'solid'
        };
    };

    return (
        <Paper 
            id={`tour-container-${employee.id}`}
            ref={node => {
                drop(node);
                dropRef.current = node;
            }}
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
                    <TourHeader employee={employee} route={route} />

                    <TourStats employee={employee} route={route} />
                    
                    <TourControls
                        expanded={expanded}
                        optimizeState={{ isOptimizing: routeManagement.isOptimizing }}
                        tourPatientsCount={sortedRoutePatients.length + emptyTypePatients.length}
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
                <TourSummary
                    sortedRoutePatients={sortedRoutePatients}
                    normalTkPatients={normalTkPatients}
                    emptyTypePatients={emptyTypePatients}
                    getPatientAppointments={getPatientAppointments}
                />
            )}
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 1 }} />
                
                {hasAppointmentsForDay ? (
                    <>
                        <TourSections
                            sortedRoutePatients={sortedRoutePatients}
                            tourEmployeePatients={tourEmployeePatients}
                            normalTkPatients={normalTkPatients}
                            tourEmployeeTkPatients={tourEmployeeTkPatients}
                            emptyTypePatients={emptyTypePatients}
                            getPatientAppointments={getPatientAppointments}
                            isTourEmployeeAppointment={isTourEmployeeAppointment}
                            selectedDay={selectedDay}
                            employeeId={employee.id}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                        />
                    </>
                ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Keine Termine für diesen Tag geplant.
                    </Alert>
                )}
            </Collapse>
            
            <ReplacementConfirmationDialog
                open={replacementDialog.open}
                onClose={handleReplacementDialogClose}
                onConfirm={handleReplacementDialogConfirm}
                sourceEmployee={employees.find(e => e.id === replacementDialog.sourceEmployeeId) || employee}
                targetEmployee={employees.find(e => e.id === replacementDialog.targetEmployeeId) || employee}
                replacementEmployee={replacementDialog.replacementEmployee}
                patientName={replacementDialog.patientName || ''}
                weekday={selectedDay}
            />
        </Paper>
    );
}; 