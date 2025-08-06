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
}

export const ToursView: React.FC<ToursViewProps> = ({ selectedDay }) => {
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
    
    // Other employees with patients (active only)
    const activeOtherEmployeesWithPatients = otherEmployees.filter(e => 
        e.is_active && hasPatientInEmployee(e.id || 0)
    );
    
    // Other employees without patients (active only)
    const activeOtherEmployeesWithoutPatients = otherEmployees.filter(e => 
        e.is_active && !hasPatientInEmployee(e.id || 0)
    );
    
    // Inactive employees (all, regardless of patients)
    const inactiveEmployees = allEmployees.filter(e => !e.is_active);
    
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


            {/* Display tour containers for active other employees with patients */}
            {activeOtherEmployeesWithPatients.length > 0 && (
                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    '& > *': { 
                        flexGrow: 1,
                        flexShrink: 1,
                        // Verbesserte Responsivität mit angepassten Größen
                        flexBasis: {
                            xs: '100%',              // Volle Breite auf kleinen Geräten
                            sm: 'calc(100% - 16px)', // Eine pro Zeile auf kleinen Bildschirmen
                            md: '47%',               // ~2 pro Zeile auf mittleren Bildschirmen mit etwas Abstand
                            lg: '31%',               // ~3 pro Zeile auf großen Bildschirmen mit Abstand
                            xl: '23%'                // ~4 pro Zeile auf sehr großen Bildschirmen mit Abstand
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
                    {activeOtherEmployeesWithPatients.map(employee => (
                        <TourContainer
                            key={employee.id}
                            employee={employee}
                            employees={filteredEmployees}
                            patients={patients}
                            appointments={appointments}
                            selectedDay={selectedDay}
                            routes={filteredRoutes}
                        />
                    ))}
                </Box>
            )}
            

            
            {/* Display empty tours for active other employees (not doctors) */}
            {activeOtherEmployeesWithoutPatients.length > 0 && (
                <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmptyIcon />
                            Leere Touren
                        </Typography>
                    </Box>
                    
                    <Box sx={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        '& > *': { 
                            flexGrow: 1,
                            flexShrink: 1,
                            // Verbesserte Responsivität mit angepassten Größen
                            flexBasis: {
                                xs: '100%',              // Volle Breite auf kleinen Geräten
                                sm: 'calc(100% - 16px)', // Eine pro Zeile auf kleinen Bildschirmen
                                md: '47%',               // ~2 pro Zeile auf mittleren Bildschirmen mit etwas Abstand
                                lg: '31%',               // ~3 pro Zeile auf großen Bildschirmen mit Abstand
                                xl: '23%'                // ~4 pro Zeile auf sehr großen Bildschirmen mit Abstand
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
                        {activeOtherEmployeesWithoutPatients.map(employee => (
                            <TourContainer
                                key={`empty-${employee.id}`}
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
            
            {/* Display inactive employees */}
            {inactiveEmployees.length > 0 && (
                <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
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
                        {inactiveEmployees.map(employee => (
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
            
            {/* Display doctors and freelance doctors separately */}
            {doctors.length > 0 && (
                <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DoctorIcon />
                            Ärzte
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
                        {doctors.map(employee => (
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
        </Box>
    );
}; 