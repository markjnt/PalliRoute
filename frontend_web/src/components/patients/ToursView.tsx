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

    // Get employees with tour numbers
    const employeesWithTours = [...filteredEmployees]
        .filter(e => e.tour_number)
        .sort((a, b) => {
            if (!a.tour_number || !b.tour_number) return 0;
            return a.tour_number - b.tour_number;
        });
    
    // Get employees without tour numbers
    const employeesWithoutTours = filteredEmployees.filter(e => !e.tour_number);
    
    // Separate employees with tours but without patients
    const hasPatientInTour = (tourNumber: number) => {
        return patients.some(p => p.tour === tourNumber);
    };
    
    // Filter employees with empty tours (have tour number but no patients)
    const employeesWithEmptyTours = employeesWithTours.filter(
        e => e.tour_number && !hasPatientInTour(e.tour_number)
    );
    
    // Filter inactive employees with empty tours for additional warning
    const inactiveEmployeesWithEmptyTours = employeesWithEmptyTours.filter(e => !e.is_active);
    
    // Filter employees with tours and patients
    const employeesWithPatientsInTours = employeesWithTours.filter(
        e => e.tour_number && hasPatientInTour(e.tour_number)
    );
    
    // Filter inactive employees with tours and patients 
    const inactiveEmployeesWithPatientsInTours = employeesWithPatientsInTours.filter(e => !e.is_active);
    
    // Filter active employees with tours and patients
    const activeEmployeesWithPatientsInTours = employeesWithPatientsInTours.filter(e => e.is_active);
    
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
            {/* Display warning at the top of the page if there are inactive employees with tours */}
            {(inactiveEmployeesWithPatientsInTours.length > 0 || inactiveEmployeesWithEmptyTours.length > 0) && (
                <Alert 
                    severity="warning" 
                    icon={<WarningIcon />}
                    sx={{ mb: 3 }}
                >
                    <Typography variant="body1" fontWeight="medium">
                        Inaktive Mitarbeiter
                    </Typography>
                </Alert>
            )}

            {/* Display tour containers for active employees with tour numbers and patients */}
            {activeEmployeesWithPatientsInTours.length > 0 && (
                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 3,
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
                    {activeEmployeesWithPatientsInTours.map(employee => (
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
            
            {/* Display tours with inactive employees and patients */}
            {inactiveEmployeesWithPatientsInTours.length > 0 && (
                <Box sx={{ mt: activeEmployeesWithPatientsInTours.length > 0 ? 4 : 2, pt: 2, borderTop: activeEmployeesWithPatientsInTours.length > 0 ? 1 : 0, borderColor: 'divider' }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between' 
                    }}>
                        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Cancel />
                            Inaktive Touren
                        </Typography>
                        
                        
                    </Box>
                    
                    <Box sx={{
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 3,
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
                        {inactiveEmployeesWithPatientsInTours.map(employee => (
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
            
            {/* Display all employees with tours but no patients (both active and inactive) */}
            {employeesWithEmptyTours.length > 0 && (
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
                        gap: 3,
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
                        {employeesWithEmptyTours.map(employee => (
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
            
            {/* Display employees without tour numbers */}
            {employeesWithoutTours.length > 0 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DoctorIcon />
                        Ärzte
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {employeesWithoutTours.map(employee => {
                            // Get appropriate color for employee function
                            const functionColor = employeeTypeColors[employee.function] || employeeTypeColors.default;
                            // Nord/Süd-Label bestimmen
                            let areaLabel = '-';
                            let areaBg = 'grey.400';
                            if (employee.area) {
                                if (employee.area.includes('Nordkreis')) {
                                    areaLabel = 'N';
                                    areaBg = 'primary.main';
                                } else if (employee.area.includes('Südkreis')) {
                                    areaLabel = 'S';
                                    areaBg = 'secondary.main';
                                }
                            }
                            return (
                                <Tooltip 
                                    key={employee.id} 
                                    title={`Funktion: ${employee.function} - ${employee.is_active ? 'Aktiv' : 'Inaktiv'}`}
                                >
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        // startIcon entfernt
                                        endIcon={employee.is_active ? 
                                            <CheckCircle color="success" fontSize="small" /> : 
                                            <Cancel color="error" fontSize="small" />
                                        }
                                        sx={{ 
                                            mr: 1, 
                                            mb: 1,
                                            borderColor: functionColor,
                                            color: 'text.primary',
                                            '&:hover': {
                                                borderColor: functionColor,
                                                backgroundColor: `${functionColor}10`,
                                            },
                                            backgroundColor: `${functionColor}08`,
                                            opacity: employee.is_active ? 1 : 0.7,
                                        }}
                                    >
                                        {/* Nord/Süd Chip vor dem Namen */}
                                        <Chip
                                            label={areaLabel}
                                            size="small"
                                            sx={{
                                                height: '20px',
                                                fontSize: '0.7rem',
                                                bgcolor: areaBg,
                                                color: 'white',
                                                fontWeight: 'bold',
                                                mr: 1
                                            }}
                                        />
                                        {employee.first_name} {employee.last_name}
                                        <Chip 
                                            label={employee.function}
                                            size="small"
                                            sx={{ 
                                                ml: 1,
                                                height: '18px',
                                                fontSize: '0.7rem',
                                                backgroundColor: functionColor,
                                                color: 'white',
                                            }}
                                        />
                                    </Button>
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Box>
    );
}; 