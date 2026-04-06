import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { Employee, Weekday } from '../../types/models';
import { TourContainer } from './TourContainer';
import { NursingAreaRouteSummary } from './tour/NursingAreaRouteSummary';
import { WeekendToursView } from './weekend/WeekendToursView';
import { Person as PersonIcon, LocalHospital as DoctorIcon, RemoveCircle as EmptyIcon } from '@mui/icons-material';
import { useRoutes } from '../../services/queries/useRoutes';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useAreaStore } from '../../stores/useAreaStore';
import { useEmployeeManagement, useAreaManagement, useNrwpHolidayForTourDay } from '../../hooks';

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
    const { isAreaTourDay } = useNrwpHolidayForTourDay(selectedDay);

    const { data: employees = [], isLoading: loadingEmployees, error: employeesError } = useEmployees();
    const { data: patients = [], isLoading: loadingPatients, error: patientsError } = usePatients();
    const { data: appointments = [], isLoading: loadingAppointments, error: appointmentsError } = useAppointmentsByWeekday(selectedDay);
    const { data: routes = [], isLoading: loadingRoutes, error: routesError } = useRoutes({ weekday: selectedDay });
    const { currentArea } = useAreaStore();

    const employeeManagement = useEmployeeManagement({
        employees,
        appointments,
        selectedDay,
        currentArea: currentArea || undefined
    });

    const areaManagement = useAreaManagement({
        routes,
        appointments,
        selectedDay,
        currentArea: currentArea || undefined
    });

    const filteredEmployees = employeeManagement.getFilteredEmployees();
    const filteredRoutes = areaManagement.getFilteredRoutes();

    const {
        filteredActiveOtherEmployeesWithPatients,
        filteredActiveOtherEmployeesWithoutPatients,
        filteredDoctors
    } = filteredResults;

    const activeOtherEmployeesWithPatients = useMemo(() => filteredActiveOtherEmployeesWithPatients, [filteredActiveOtherEmployeesWithPatients]);
    const activeOtherEmployeesWithoutPatients = useMemo(() => filteredActiveOtherEmployeesWithoutPatients, [filteredActiveOtherEmployeesWithoutPatients]);
    const activeDoctorsWithPatients = useMemo(() => {
        return filteredDoctors.filter(doctor => employeeManagement.hasPatientInEmployee(doctor.id || 0));
    }, [filteredDoctors, employeeManagement]);
    const activeDoctorsWithoutPatients = useMemo(() => {
        return filteredDoctors.filter(doctor => !employeeManagement.hasPatientInEmployee(doctor.id || 0));
    }, [filteredDoctors, employeeManagement]);

    if (isAreaTourDay) {
        return (
            <Box>
                <WeekendToursView selectedDay={selectedDay} />
            </Box>
        );
    }

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
            <NursingAreaRouteSummary
                employees={employees}
                routes={routes}
                selectedDay={selectedDay}
            />
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

            {/* 3. Leere Pflegetouren */}
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

            {/* 4. Leere Ärztetouren */}
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

            {searchTerm &&
                activeOtherEmployeesWithPatients.length === 0 &&
                activeDoctorsWithPatients.length === 0 &&
                activeOtherEmployeesWithoutPatients.length === 0 &&
                activeDoctorsWithoutPatients.length === 0 && (
                    <Alert severity="info" sx={{ my: 2 }}>
                        Keine Ergebnisse für "{searchTerm}" gefunden.
                    </Alert>
                )}
        </Box>
    );
};
