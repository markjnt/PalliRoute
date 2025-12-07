import React from 'react';
import { List, ListItem, Typography, Paper, Box } from '@mui/material';
import { Home as HomeIcon, Phone as PhoneIcon, AddCircle as AddCircleIcon, Person as PersonIcon } from '@mui/icons-material';
import { Patient, Appointment, Weekday, Route } from '../../types/models';
import { PatientCard } from './PatientCard';

interface TourSectionsProps {
    sortedRoutePatients: Patient[];
    tourEmployeePatients: Patient[];  // Tour employee patients (HB + NA, shown but not in route)
    normalTkPatients: Patient[];  // Normal TK patients (not tour_employee)
    tourEmployeeTkPatients: Patient[];  // Tour employee TK patients (shown but not in normal TK section)
    emptyTypePatients: Patient[];
    getPatientAppointments: (patientId: number) => Appointment[];
    isTourEmployeeAppointment: (appointment: Appointment, employeeId?: number) => boolean;
    selectedDay: Weekday;
    employeeId?: number;
    onMoveUp: (patientId: number) => void;
    onMoveDown: (patientId: number) => void;
    // New props for appointments
    normalRouteAppointments: Appointment[];
    tourEmployeeAppointments: Appointment[];
    normalTkAppointments: Appointment[];
    tourEmployeeTkAppointments: Appointment[];
    normalEmptyTypeAppointments: Appointment[];
    tourEmployeeEmptyTypeAppointments: Appointment[];
    route?: Route | undefined;
    patients: Patient[];
}

const TourSections: React.FC<TourSectionsProps> = ({
    sortedRoutePatients,
    tourEmployeePatients,
    normalTkPatients,
    tourEmployeeTkPatients,
    emptyTypePatients,
    getPatientAppointments,
    isTourEmployeeAppointment,
    selectedDay,
    employeeId,
    onMoveUp,
    onMoveDown,
    normalRouteAppointments,
    tourEmployeeAppointments,
    normalTkAppointments,
    tourEmployeeTkAppointments,
    normalEmptyTypeAppointments,
    tourEmployeeEmptyTypeAppointments,
    route,
    patients
}) => {
    // Sort route appointments by route order if route exists
    const allRouteAppointments = React.useMemo(() => {
        // Sort by route order if route exists
        if (route?.route_order) {
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
            
            // Sort appointments by route order
            const sortedApps: Appointment[] = [];
            const appointmentMap = new Map(normalRouteAppointments.map(app => [app.id, app]));
            
            // Add appointments in route order
            for (const appointmentId of routeOrder) {
                const app = appointmentMap.get(appointmentId);
                if (app) {
                    sortedApps.push(app);
                    appointmentMap.delete(appointmentId);
                }
            }
            
            // Add remaining appointments
            sortedApps.push(...Array.from(appointmentMap.values()));
            
            return sortedApps;
        }
        
        return normalRouteAppointments;
    }, [normalRouteAppointments, route]);
    
    return (
        <>
            {/* Home visits and new admissions (HB + NA) section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                <HomeIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                    Route ({allRouteAppointments.length})
                </Typography>
            </Box>
            {allRouteAppointments.length > 0 ? (
                <List dense disablePadding>
                    {(() => {
                        // Group appointments by patient_id
                        const appointmentsByPatient = new Map<number, Appointment[]>();
                        allRouteAppointments.forEach(app => {
                            const patientId = app.patient_id;
                            if (!appointmentsByPatient.has(patientId)) {
                                appointmentsByPatient.set(patientId, []);
                            }
                            appointmentsByPatient.get(patientId)!.push(app);
                        });
                        
                        // Create a map of tour employee appointments by patient_id
                        const tourEmployeeAppointmentsByPatient = new Map<number, Appointment[]>();
                        tourEmployeeAppointments.forEach(app => {
                            const patientId = app.patient_id;
                            if (!tourEmployeeAppointmentsByPatient.has(patientId)) {
                                tourEmployeeAppointmentsByPatient.set(patientId, []);
                            }
                            tourEmployeeAppointmentsByPatient.get(patientId)!.push(app);
                        });
                        
                        let globalIndex = 0;
                        return Array.from(appointmentsByPatient.entries()).map(([patientId, patientAppts]) => {
                            const patient = patients.find(p => p.id === patientId);
                            if (!patient) return null;
                            
                            const allPatientAppointments = getPatientAppointments(patient.id || 0);
                            const visitType = patientAppts[0].visit_type === 'HB' ? 'HB' : 'NA';
                            const isMultiple = patientAppts.length > 1;
                            const currentIndex = globalIndex + 1;
                            globalIndex += patientAppts.length;
                            
                            // Check if there are tour employee appointments for this patient
                            const tourEmployeeApptsForPatient = tourEmployeeAppointmentsByPatient.get(patientId);
                            
                            return (
                                <ListItem 
                                    key={`route-patient-${patientId}`} 
                                    disablePadding 
                                    sx={{ mb: 1 }}
                                >
                                    <PatientCard
                                        patient={patient}
                                        appointments={allPatientAppointments}
                                        visitType={visitType}
                                        index={currentIndex}
                                        selectedDay={selectedDay}
                                        onMoveUp={onMoveUp}
                                        onMoveDown={onMoveDown}
                                        isFirst={currentIndex === 1}
                                        isLast={globalIndex === allRouteAppointments.length}
                                        isTourEmployeeAppointment={false}
                                        currentEmployeeId={employeeId}
                                        appointmentId={patientAppts[0].id}
                                        multipleAppointments={isMultiple ? patientAppts : undefined}
                                        tourEmployeeAppointmentsForPatient={tourEmployeeApptsForPatient}
                                    />
                                </ListItem>
                            );
                        });
                    })()}
                </List>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Keine Route-Termine für diesen Tag geplant.
                </Typography>
            )}
            
            {/* Tour employee appointments (shown but not in route) */}
            {(() => {
                // Filter out tour employee appointments that already have a normal route appointment for the same patient
                const normalRoutePatientIds = new Set(allRouteAppointments.map(app => app.patient_id));
                const filteredTourEmployeeAppointments = tourEmployeeAppointments.filter(
                    app => !normalRoutePatientIds.has(app.patient_id)
                );
                
                if (filteredTourEmployeeAppointments.length === 0) return null;
                
                return (
                    <Box sx={{ mt: 2 }}>
                        <List dense disablePadding>
                            {(() => {
                                // Group appointments by patient_id
                                const appointmentsByPatient = new Map<number, Appointment[]>();
                                filteredTourEmployeeAppointments.forEach(app => {
                                    const patientId = app.patient_id;
                                    if (!appointmentsByPatient.has(patientId)) {
                                        appointmentsByPatient.set(patientId, []);
                                    }
                                    appointmentsByPatient.get(patientId)!.push(app);
                                });
                                
                                return Array.from(appointmentsByPatient.entries()).map(([patientId, patientAppts]) => {
                                    const patient = patients.find(p => p.id === patientId);
                                    if (!patient) return null;
                                    
                                    const allPatientAppointments = getPatientAppointments(patient.id || 0);
                                    const visitType = patientAppts[0].visit_type === 'HB' ? 'HB' : 'NA';
                                    const isMultiple = patientAppts.length > 1;
                                    
                                    // Since appointments are grouped by patient_id, each displayed appointment is the first for this patient
                                    // So isFirstTourEmployeeAppointment should always be true
                                    return (
                                        <ListItem 
                                            key={`tour-patient-${patientId}`} 
                                            disablePadding 
                                            sx={{ mb: 1 }}
                                        >
                                            <PatientCard
                                                patient={patient}
                                                appointments={allPatientAppointments}
                                                visitType={visitType}
                                                selectedDay={selectedDay}
                                                isTourEmployeeAppointment={true}
                                                currentEmployeeId={employeeId}
                                                appointmentId={patientAppts[0].id}
                                                multipleAppointments={isMultiple ? patientAppts : undefined}
                                                isFirstTourEmployeeAppointment={true}
                                            />
                                        </ListItem>
                                    );
                                });
                            })()}
                        </List>
                    </Box>
                );
            })()}

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
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'success.main' }}>
                        <PhoneIcon color="success" />
                        <Typography variant="h6" sx={{ ml: 1 }}>
                            Telefonkontakte ({normalTkAppointments.length})
                        </Typography>
                    </Box>
                    {(() => {
                        // Group normal TK appointments by patient_id
                        const tkAppointmentsByPatient = new Map<number, Appointment[]>();
                        normalTkAppointments.forEach(app => {
                            const patientId = app.patient_id;
                            if (!tkAppointmentsByPatient.has(patientId)) {
                                tkAppointmentsByPatient.set(patientId, []);
                            }
                            tkAppointmentsByPatient.get(patientId)!.push(app);
                        });
                        
                        // Create a map of tour employee TK appointments by patient_id
                        const tourEmployeeTkAppointmentsByPatient = new Map<number, Appointment[]>();
                        tourEmployeeTkAppointments.forEach(app => {
                            const patientId = app.patient_id;
                            if (!tourEmployeeTkAppointmentsByPatient.has(patientId)) {
                                tourEmployeeTkAppointmentsByPatient.set(patientId, []);
                            }
                            tourEmployeeTkAppointmentsByPatient.get(patientId)!.push(app);
                        });
                        
                        const allTkPatientIds = new Set([...tkAppointmentsByPatient.keys(), ...tourEmployeeTkAppointmentsByPatient.keys()]);
                        
                        if (allTkPatientIds.size === 0) {
                            return (
                                <Typography variant="body2" color="text.secondary">
                                    Keine Telefonkontakte für diesen Tag geplant.
                                </Typography>
                            );
                        }
                        
                        return (
                            <List dense disablePadding>
                                {Array.from(allTkPatientIds).map((patientId) => {
                                    const patient = patients.find(p => p.id === patientId);
                                    if (!patient) return null;
                                    
                                    const normalTkAppts = tkAppointmentsByPatient.get(patientId) || [];
                                    const tourEmployeeTkAppts = tourEmployeeTkAppointmentsByPatient.get(patientId) || [];
                                    
                                    // If there are normal TK appointments, show them and include tour employee appointments
                                    if (normalTkAppts.length > 0) {
                                        const allPatientAppointments = getPatientAppointments(patient.id || 0);
                                        const isMultiple = normalTkAppts.length > 1;
                                        
                                        return (
                                            <ListItem 
                                                key={`tk-patient-${patientId}`} 
                                                disablePadding 
                                                sx={{ mb: 1 }}
                                            >
                                                <PatientCard
                                                    patient={patient}
                                                    appointments={allPatientAppointments}
                                                    visitType="TK"
                                                    compact
                                                    selectedDay={selectedDay}
                                                    isTourEmployeeAppointment={false}
                                                    currentEmployeeId={employeeId}
                                                    appointmentId={normalTkAppts[0].id}
                                                    multipleAppointments={isMultiple ? normalTkAppts : undefined}
                                                    tourEmployeeAppointmentsForPatient={tourEmployeeTkAppts.length > 0 ? tourEmployeeTkAppts : undefined}
                                                />
                                            </ListItem>
                                        );
                                    }
                                    
                                    // Only tour employee TK appointments (no normal ones)
                                    if (tourEmployeeTkAppts.length > 0) {
                                        const allPatientAppointments = getPatientAppointments(patient.id || 0);
                                        const isMultiple = tourEmployeeTkAppts.length > 1;
                                        
                                        return (
                                            <ListItem 
                                                key={`tour-tk-patient-${patientId}`} 
                                                disablePadding 
                                                sx={{ mb: 1 }}
                                            >
                                                <PatientCard
                                                    patient={patient}
                                                    appointments={allPatientAppointments}
                                                    visitType="TK"
                                                    compact
                                                    selectedDay={selectedDay}
                                                    isTourEmployeeAppointment={true}
                                                    currentEmployeeId={employeeId}
                                                    appointmentId={tourEmployeeTkAppts[0].id}
                                                    multipleAppointments={isMultiple ? tourEmployeeTkAppts : undefined}
                                                />
                                            </ListItem>
                                        );
                                    }
                                    
                                    return null;
                                })}
                            </List>
                        );
                    })()}
                </Paper>
            </Box>

            {/* Patients with empty visit type */}
            {(() => {
                // Group normal empty type appointments by patient_id
                const emptyTypeAppointmentsByPatient = new Map<number, Appointment[]>();
                normalEmptyTypeAppointments.forEach(app => {
                    const patientId = app.patient_id;
                    if (!emptyTypeAppointmentsByPatient.has(patientId)) {
                        emptyTypeAppointmentsByPatient.set(patientId, []);
                    }
                    emptyTypeAppointmentsByPatient.get(patientId)!.push(app);
                });
                
                // Create a map of tour employee empty type appointments by patient_id
                const tourEmployeeEmptyTypeAppointmentsByPatient = new Map<number, Appointment[]>();
                tourEmployeeEmptyTypeAppointments.forEach(app => {
                    const patientId = app.patient_id;
                    if (!tourEmployeeEmptyTypeAppointmentsByPatient.has(patientId)) {
                        tourEmployeeEmptyTypeAppointmentsByPatient.set(patientId, []);
                    }
                    tourEmployeeEmptyTypeAppointmentsByPatient.get(patientId)!.push(app);
                });
                
                const allEmptyTypePatientIds = new Set([...emptyTypeAppointmentsByPatient.keys(), ...tourEmployeeEmptyTypeAppointmentsByPatient.keys()]);
                
                if (allEmptyTypePatientIds.size === 0) return null;
                
                return (
                    <Box sx={{ mt: 2 }}>
                        <Paper 
                            variant="outlined" 
                            sx={{ 
                                p: 2,
                                bgcolor: 'rgba(158, 158, 158, 0.04)'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
                                <PersonIcon color="action" />
                                <Typography variant="h6" sx={{ ml: 1 }}>
                                    Ohne Besuch ({allEmptyTypePatientIds.size})
                                </Typography>
                            </Box>
                            <List dense disablePadding>
                                {Array.from(allEmptyTypePatientIds).map((patientId) => {
                                    const patient = patients.find(p => p.id === patientId);
                                    if (!patient) return null;
                                    
                                    const normalEmptyTypeAppts = emptyTypeAppointmentsByPatient.get(patientId) || [];
                                    const tourEmployeeEmptyTypeAppts = tourEmployeeEmptyTypeAppointmentsByPatient.get(patientId) || [];
                                    
                                    // If there are normal empty type appointments, show them and include tour employee appointments
                                    if (normalEmptyTypeAppts.length > 0) {
                                        const allPatientAppointments = getPatientAppointments(patient.id || 0);
                                        const isMultiple = normalEmptyTypeAppts.length > 1;
                                        
                                        return (
                                            <ListItem 
                                                key={`empty-patient-${patientId}`} 
                                                disablePadding 
                                                sx={{ width: '100%' }}
                                            >
                                                <PatientCard
                                                    patient={patient}
                                                    appointments={allPatientAppointments}
                                                    visitType="none"
                                                    compact
                                                    selectedDay={selectedDay}
                                                    isTourEmployeeAppointment={false}
                                                    currentEmployeeId={employeeId}
                                                    appointmentId={normalEmptyTypeAppts[0].id}
                                                    multipleAppointments={isMultiple ? normalEmptyTypeAppts : undefined}
                                                    tourEmployeeAppointmentsForPatient={tourEmployeeEmptyTypeAppts.length > 0 ? tourEmployeeEmptyTypeAppts : undefined}
                                                />
                                            </ListItem>
                                        );
                                    }
                                    
                                    // Only tour employee empty type appointments (no normal ones)
                                    if (tourEmployeeEmptyTypeAppts.length > 0) {
                                        const allPatientAppointments = getPatientAppointments(patient.id || 0);
                                        const isMultiple = tourEmployeeEmptyTypeAppts.length > 1;
                                        
                                        return (
                                            <ListItem 
                                                key={`tour-empty-patient-${patientId}`} 
                                                disablePadding 
                                                sx={{ width: '100%' }}
                                            >
                                                <PatientCard
                                                    patient={patient}
                                                    appointments={allPatientAppointments}
                                                    visitType="none"
                                                    compact
                                                    selectedDay={selectedDay}
                                                    isTourEmployeeAppointment={true}
                                                    currentEmployeeId={employeeId}
                                                    appointmentId={tourEmployeeEmptyTypeAppts[0].id}
                                                    multipleAppointments={isMultiple ? tourEmployeeEmptyTypeAppts : undefined}
                                                />
                                            </ListItem>
                                        );
                                    }
                                    
                                    return null;
                                })}
                            </List>
                        </Paper>
                    </Box>
                );
            })()}
        </>
    );
};

export default TourSections; 