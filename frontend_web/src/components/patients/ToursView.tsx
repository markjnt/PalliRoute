import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Button, Chip, Tooltip } from '@mui/material';
import { Patient, Appointment, Employee, Weekday, Route } from '../../types/models';
import { TourContainer } from './TourContainer';
import { WeekendToursView } from './weekend/WeekendToursView';
import { Person as PersonIcon, CheckCircle, Cancel, Warning as WarningIcon, Route as RouteIcon, LocalHospital as DoctorIcon, RemoveCircle as EmptyIcon } from '@mui/icons-material';
import { employeeTypeColors } from '../../utils/colors';
import { useRoutes } from '../../services/queries/useRoutes';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useAreaStore } from '../../stores/useAreaStore';

interface ToursViewProps {
    selectedDay: Weekday;
    searchTerm: string;
    filteredResults: {
        filteredActiveOtherEmployeesWithPatients: Employee[];
        filteredActiveOtherEmployeesWithoutPatients: Employee[];
        filteredDoctors: Employee[];
    };
}

export const ToursView: React.FC<ToursViewProps> = ({ selectedDay, searchTerm, filteredResults }) => {
    // Check if this is a weekend day
    const isWeekend = selectedDay === 'saturday' || selectedDay === 'sunday';
    
    // For weekend days, show only the weekend tours view
    if (isWeekend) {
        return <WeekendToursView selectedDay={selectedDay} />;
    }

    // React Query Hooks (only for weekdays)
    const { data: employees = [], isLoading: loadingEmployees, error: employeesError } = useEmployees();
    const { data: patients = [], isLoading: loadingPatients, error: patientsError } = usePatients();
    const { data: appointments = [], isLoading: loadingAppointments, error: appointmentsError } = useAppointmentsByWeekday(selectedDay);
    const { data: routes = [], isLoading: loadingRoutes, error: routesError, refetch: refetchRoutes } = useRoutes({ weekday: selectedDay });
    const { currentArea } = useAreaStore();

    // Area filtering logic
    const isAllAreas = currentArea === 'Nord- und Südkreis';
    // Employees filtered by area
    const filteredEmployees = isAllAreas ? employees : employees.filter(e => e.area === currentArea);
    // Routes filtered by area
    const filteredRoutes = isAllAreas ? routes : routes.filter(r => r.area === currentArea);

    // Get all employees
    const allEmployees = [...filteredEmployees]
        .sort((a, b) => {
            // First sort by area (Nordkreis first, then Südkreis)
            const getAreaOrder = (area?: string) => {
                if (!area) return 2;
                if (area.includes('Nordkreis')) return 0;
                if (area.includes('Südkreis')) return 1;
                return 2;
            };
            
            const areaOrderA = getAreaOrder(a.area);
            const areaOrderB = getAreaOrder(b.area);
            
            if (areaOrderA !== areaOrderB) {
                return areaOrderA - areaOrderB;
            }
            
            // Then sort alphabetically by last name
            return a.last_name.localeCompare(b.last_name);
        });
    
    // Separate employees with patients from those without
    const hasPatientInEmployee = (employeeId: number) => {
        return appointments.some(app => {
            if (app.weekday === selectedDay && app.employee_id) {
                return app.employee_id === employeeId;
            }
            return false;
        });
    };
    
    // Separate doctors from other employees
    const doctors = allEmployees.filter(e => e.function === 'Arzt' || e.function === 'Honorararzt');
    const otherEmployees = allEmployees.filter(e => e.function !== 'Arzt' && e.function !== 'Honorararzt');
    

    


    // Use filtered results from SearchField component
    const {
        filteredActiveOtherEmployeesWithPatients,
        filteredActiveOtherEmployeesWithoutPatients,
        filteredDoctors
    } = filteredResults;

    // Reorganize sections according to new requirements
    // 1. Pflegetouren: Active other employees with patients
    const activeOtherEmployeesWithPatients = React.useMemo(() => {
        return filteredActiveOtherEmployeesWithPatients;
    }, [filteredActiveOtherEmployeesWithPatients]);

    // 2. Ärzte: Doctors with patients
    const doctorsWithPatients = React.useMemo(() => {
        return filteredDoctors.filter(doctor => hasPatientInEmployee(doctor.id || 0));
    }, [filteredDoctors, appointments, selectedDay]);

    // 3. Leere Pflegetouren: Other employees without patients
    const otherEmployeesWithoutPatients = React.useMemo(() => {
        return filteredActiveOtherEmployeesWithoutPatients;
    }, [filteredActiveOtherEmployeesWithoutPatients]);

    // 4. Leere Ärztetouren: Doctors without patients
    const doctorsWithoutPatients = React.useMemo(() => {
        return filteredDoctors.filter(doctor => 
            !hasPatientInEmployee(doctor.id || 0)
        );
    }, [filteredDoctors, appointments, selectedDay]);

    if (loadingEmployees || loadingPatients || loadingAppointments || loadingRoutes) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }
    
    if (employeesError || patientsError || appointmentsError || routesError) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                {employeesError?.message || patientsError?.message || appointmentsError?.message || routesError?.message || null}
            </Alert>
        );
    }
    
    if (patients.length === 0) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                Keine Routen gefunden. Importieren Sie Patienten über den Excel Import.
            </Alert>
        );
    }
    
    return (
        <Box>
            {/* 1. Pflegetouren - Active other employees with patients */}
            {activeOtherEmployeesWithPatients.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon />
                            Pflegetouren
                        </Typography>
                    </Box>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        '& > *': { 
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: {
                                xs: '100%',
                                sm: 'calc(100% - 16px)',
                                md: '47%',
                                lg: '31%',
                                xl: '23%'
                            },
                            minWidth: {
                                xs: '280px',
                                sm: '320px',
                                md: '340px'
                            },
                            maxWidth: {
                                xs: '100%',
                                sm: '100%',
                                md: '100%',
                                lg: '900px'
                            }
                        }
                    }}>
                        {activeOtherEmployeesWithPatients.map((employee: Employee) => (
                            <TourContainer
                                key={`pflege-${employee.id}`}
                                employee={employee}
                                employees={filteredEmployees}
                                patients={patients}
                                appointments={appointments}
                                selectedDay={selectedDay}
                                routes={filteredRoutes}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* 2. Ärzte - Doctors with patients */}
            {doctorsWithPatients.length > 0 && (
                <Box sx={{ mb: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DoctorIcon />
                            Ärztetouren
                        </Typography>
                    </Box>
                    
                    <Box sx={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        '& > *': { 
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: {
                                xs: '100%',
                                sm: 'calc(100% - 16px)',
                                md: '47%',
                                lg: '31%',
                                xl: '23%'
                            },
                            minWidth: {
                                xs: '280px',
                                sm: '320px',
                                md: '340px'
                            },
                            maxWidth: {
                                xs: '100%',
                                sm: '100%',
                                md: '100%',
                                lg: '900px'
                            }
                        }
                    }}>
                        {doctorsWithPatients.map((employee: Employee) => (
                            <TourContainer
                                key={`doctor-${employee.id}`}
                                employee={employee}
                                employees={filteredEmployees}
                                patients={patients}
                                appointments={appointments}
                                selectedDay={selectedDay}
                                routes={filteredRoutes}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* 3. Leere Pflegetouren - Other employees without patients */}
            {otherEmployeesWithoutPatients.length > 0 && (
                <Box sx={{ mb: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmptyIcon />
                            Leere Pflegetouren
                        </Typography>
                    </Box>
                    
                    <Box sx={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        '& > *': { 
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: {
                                xs: '100%',
                                sm: 'calc(100% - 16px)',
                                md: '47%',
                                lg: '31%',
                                xl: '23%'
                            },
                            minWidth: {
                                xs: '280px',
                                sm: '320px',
                                md: '340px'
                            },
                            maxWidth: {
                                xs: '100%',
                                sm: '100%',
                                md: '100%',
                                lg: '900px'
                            }
                        }
                    }}>
                        {otherEmployeesWithoutPatients.map((employee: Employee) => (
                            <TourContainer
                                key={`empty-pflege-${employee.id}`}
                                employee={employee}
                                employees={filteredEmployees}
                                patients={patients}
                                appointments={appointments}
                                selectedDay={selectedDay}
                                routes={filteredRoutes}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* 4. Leere Ärztetouren - Doctors without patients */}
            {doctorsWithoutPatients.length > 0 && (
                <Box sx={{ mb: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmptyIcon />
                            Leere Ärztetouren
                        </Typography>
                    </Box>
                    
                    <Box sx={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        '& > *': { 
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: {
                                xs: '100%',
                                sm: 'calc(100% - 16px)',
                                md: '47%',
                                lg: '31%',
                                xl: '23%'
                            },
                            minWidth: {
                                xs: '280px',
                                sm: '320px',
                                md: '340px'
                            },
                            maxWidth: {
                                xs: '100%',
                                sm: '100%',
                                md: '100%',
                                lg: '900px'
                            }
                        }
                    }}>
                        {doctorsWithoutPatients.map((employee: Employee) => (
                            <TourContainer
                                key={`empty-doctor-${employee.id}`}
                                employee={employee}
                                employees={filteredEmployees}
                                patients={patients}
                                appointments={appointments}
                                selectedDay={selectedDay}
                                routes={filteredRoutes}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Show message when no results found */}
            {searchTerm && 
             activeOtherEmployeesWithPatients.length === 0 && 
             doctorsWithPatients.length === 0 && 
             otherEmployeesWithoutPatients.length === 0 && 
             doctorsWithoutPatients.length === 0 && (
                <Alert severity="info" sx={{ my: 2 }}>
                    Keine Ergebnisse für "{searchTerm}" gefunden.
                </Alert>
            )}
        </Box>
    );
}; 