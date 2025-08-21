import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Button, Chip, Tooltip } from '@mui/material';
import { Patient, Appointment, Employee, Weekday, Route } from '../../types/models';
import { TourContainer } from './TourContainer';
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
        filteredInactiveEmployees: Employee[];
        filteredDoctors: Employee[];
    };
}

export const ToursView: React.FC<ToursViewProps> = ({ selectedDay, searchTerm, filteredResults }) => {
    // React Query Hooks
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
    

    
    // Inactive employees (excluding doctors)
    const inactiveEmployees = allEmployees.filter(e => !e.is_active && e.function !== 'Arzt' && e.function !== 'Honorararzt');

    // Use filtered results from SearchField component
    const {
        filteredActiveOtherEmployeesWithPatients,
        filteredActiveOtherEmployeesWithoutPatients,
        filteredInactiveEmployees,
        filteredDoctors
    } = filteredResults;

    // Reorganize sections according to new requirements
    // 1. Pflegetouren: Active other employees with patients
    const activeOtherEmployeesWithPatients = React.useMemo(() => {
        return filteredActiveOtherEmployeesWithPatients;
    }, [filteredActiveOtherEmployeesWithPatients]);

    // 2. Ärzte: Active doctors with patients
    const activeDoctorsWithPatients = React.useMemo(() => {
        return filteredDoctors.filter(doctor => doctor.is_active && hasPatientInEmployee(doctor.id || 0));
    }, [filteredDoctors, appointments, selectedDay]);

    // 3. Leere Pflegetouren: Active other employees without patients
    const activeOtherEmployeesWithoutPatients = React.useMemo(() => {
        return filteredActiveOtherEmployeesWithoutPatients;
    }, [filteredActiveOtherEmployeesWithoutPatients]);

    // 4. Leere Ärztetouren: Active doctors without patients
    const activeDoctorsWithoutPatients = React.useMemo(() => {
        const allActiveDoctors = filteredDoctors.filter(doctor => doctor.is_active);
        return allActiveDoctors.filter(doctor => 
            !hasPatientInEmployee(doctor.id || 0)
        );
    }, [filteredDoctors, appointments, selectedDay]);

    // 5. Inaktive Mitarbeiter: All inactive employees (doctors and other employees)
    const allInactiveEmployees = React.useMemo(() => {
        const inactiveOtherEmployees = filteredInactiveEmployees;
        const inactiveDoctors = filteredDoctors.filter(doctor => !doctor.is_active);
        return [...inactiveOtherEmployees, ...inactiveDoctors];
    }, [filteredInactiveEmployees, filteredDoctors]);

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

            {/* 2. Ärzte - Active doctors with patients */}
            {activeDoctorsWithPatients.length > 0 && (
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
                        {activeDoctorsWithPatients.map((employee: Employee) => (
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

            {/* 3. Leere Pflegetouren - Active other employees without patients */}
            {activeOtherEmployeesWithoutPatients.length > 0 && (
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
                        {activeOtherEmployeesWithoutPatients.map((employee: Employee) => (
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

            {/* 4. Leere Ärztetouren - Active doctors without patients */}
            {activeDoctorsWithoutPatients.length > 0 && (
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
                        {activeDoctorsWithoutPatients.map((employee: Employee) => (
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

            {/* 5. Inaktive Mitarbeiter - All inactive employees */}
            {allInactiveEmployees.length > 0 && (
                <Box sx={{ mb: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Cancel />
                            Inaktive Mitarbeiter
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
                        {allInactiveEmployees.map((employee: Employee) => (
                            <TourContainer
                                key={`inactive-${employee.id}`}
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
             activeDoctorsWithPatients.length === 0 && 
             activeOtherEmployeesWithoutPatients.length === 0 && 
             activeDoctorsWithoutPatients.length === 0 && 
             allInactiveEmployees.length === 0 && (
                <Alert severity="info" sx={{ my: 2 }}>
                    Keine Ergebnisse für "{searchTerm}" gefunden.
                </Alert>
            )}
        </Box>
    );
}; 