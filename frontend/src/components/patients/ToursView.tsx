import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Button, Chip, Tooltip } from '@mui/material';
import { Patient, Appointment, Employee, Weekday, Route } from '../../types/models';
import { TourContainer } from './TourContainer';
import { Person as PersonIcon, CheckCircle, Cancel, Warning as WarningIcon, Route as RouteIcon, LocalHospital as DoctorIcon, RemoveCircle as EmptyIcon } from '@mui/icons-material';
import { useAssignPatientStore } from '../../stores';
import { employeeTypeColors } from '../../utils/colors';
import { useRoutes } from '../../services/queries/useRoutes';
import { routesApi } from '../../services/api/routes';

interface ToursViewProps {
    employees: Employee[];
    patients: Patient[];
    appointments: Appointment[];
    routes: Route[];
    selectedDay: Weekday;
    loading: boolean;
    error: string | null;
}

export const ToursView: React.FC<ToursViewProps> = ({
    employees,
    patients: initialPatients,
    appointments: initialAppointments,
    routes: initialRoutes,
    selectedDay,
    loading,
    error
}) => {
    // Create local state to manage patients and appointments, allowing updates via drag and drop
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [routes, setRoutes] = useState<Route[]>(initialRoutes);
    
    // Get drag store functions
    const updateRouteOrder = useAssignPatientStore(state => state.updateRouteOrder);
    const removeFromRouteOrder = useAssignPatientStore(state => state.removeFromRouteOrder);
    
    // React Query hook für Routen - nur für das Laden von Daten
    const { refetch: refetchRoutes } = useRoutes({ weekday: selectedDay }); 
    
    // Update local state when props change
    useEffect(() => {
        setPatients(initialPatients);
    }, [initialPatients]);
    
    useEffect(() => {
        setAppointments(initialAppointments);
    }, [initialAppointments]);
    
    // Update local routes when prop changes
    useEffect(() => {
        setRoutes(initialRoutes);
    }, [initialRoutes]);
    
    // Removed all event listeners and handlers - now using React Query for data synchronization
    
    // Get employees with tour numbers
    const employeesWithTours = [...employees]
        .filter(e => e.tour_number)
        .sort((a, b) => {
            if (!a.tour_number || !b.tour_number) return 0;
            return a.tour_number - b.tour_number;
        });
    
    // Get employees without tour numbers
    const employeesWithoutTours = employees.filter(e => !e.tour_number);
    
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
    
    // Filter active employees with empty tours
    const activeEmployeesWithEmptyTours = employeesWithEmptyTours.filter(e => e.is_active);
    
    // Filter employees with tours and patients
    const employeesWithPatientsInTours = employeesWithTours.filter(
        e => e.tour_number && hasPatientInTour(e.tour_number)
    );
    
    // Filter inactive employees with tours and patients 
    const inactiveEmployeesWithPatientsInTours = employeesWithPatientsInTours.filter(e => !e.is_active);
    
    // Filter active employees with tours and patients
    const activeEmployeesWithPatientsInTours = employeesWithPatientsInTours.filter(e => e.is_active);
    
    /**
     * Handler für den Fall, dass ein Patient in eine andere Tour verschoben wird
     * 
     * Wird von TourContainer.tsx aufgerufen (Schritt 3 im Verschiebungsprozess)
     * Führt die komplexe Aktualisierung der Routen-Reihenfolge für alle relevanten Tage durch
     */
    const handlePatientMoved = async (
        movedPatient: Patient, 
        newTourNumber: number, 
        hbAppointments?: Appointment[]
    ) => {
        console.log(`Patient ${movedPatient.id} (${movedPatient.first_name} ${movedPatient.last_name}) wurde zu Tour ${newTourNumber} verschoben`);
        
        // Schritt 3.1: Aktualisiere den Patienten in unserem lokalen State
        setPatients(prevPatients => 
            prevPatients.map(patient => 
                patient.id === movedPatient.id 
                    ? { ...patient, tour: newTourNumber } 
                    : patient
            )
        );
        
        // Schritt 3.2: Identifiziere Quell- und Zielmitarbeiter
        const sourceTourNumber = movedPatient.tour;
        const sourceEmployee = employees.find(e => e.tour_number === sourceTourNumber);
        const targetEmployee = employees.find(e => e.tour_number === newTourNumber);
        
        if (!targetEmployee || !targetEmployee.id) {
            console.error(`Zielmitarbeiter mit Tour ${newTourNumber} nicht gefunden`);
            return;
        }
        
        console.log(`Quellmitarbeiter: ${sourceEmployee?.first_name} ${sourceEmployee?.last_name} (ID: ${sourceEmployee?.id})`);
        console.log(`Zielmitarbeiter: ${targetEmployee.first_name} ${targetEmployee.last_name} (ID: ${targetEmployee.id})`);
        
        // Schritt 3.3: Aktualisiere Termine im lokalen State (bereits im Backend aktualisiert)
        setAppointments(prevAppointments => 
            prevAppointments.map(appt => 
                appt.patient_id === movedPatient.id
                    ? { ...appt, employee_id: targetEmployee.id }
                    : appt
            )
        );
        
        // Gruppiere Termine nach Wochentagen für Routenaktualisierungen
        const appointmentsByWeekday = new Map<Weekday, Appointment[]>();
        
        // Wenn hbAppointments übergeben wurden, verwende diese, sonst nur die des aktuellen Tages
        if (hbAppointments && hbAppointments.length > 0) {
            // Gruppiere nach Wochentag
            hbAppointments.forEach(appt => {
                if (!appt.weekday) return;
                
                const weekday = appt.weekday as Weekday;
                if (!appointmentsByWeekday.has(weekday)) {
                    appointmentsByWeekday.set(weekday, []);
                }
                appointmentsByWeekday.get(weekday)?.push(appt);
            });
            
            console.log(`HB-Termine gruppiert nach Wochentagen:`, Object.fromEntries(appointmentsByWeekday));
        } else {
            // Fallback: Nur aktuelle Termine verwenden
            const dayAppointments = appointments.filter(
                a => a.patient_id === movedPatient.id && a.weekday === selectedDay && a.visit_type === 'HB'
            );
            
            if (dayAppointments.length > 0) {
                appointmentsByWeekday.set(selectedDay, dayAppointments);
            }
        }
        
        // Keine HB-Termine gefunden
        if (appointmentsByWeekday.size === 0) {
            console.log('Keine HB-Termine gefunden, keine Routenaktualisierung notwendig');
            return;
        }
        
        // Schritt 4: Aktualisiere Routen für ALLE betroffenen Tage
        try {
            // Führe nur die Aktualisierungen der Reihenfolge durch, ohne die lokalen Routen zu aktualisieren
            const allRoutesSnapshot = [...routes]; // Nur als Kopie für die Suche nach Quell- und Zielrouten
            
            // Erstelle ein Array von Promises für die Routenaktualisierungen aller Tage
            const updatePromises = Array.from(appointmentsByWeekday.entries()).map(async (entry) => {
                const weekday = entry[0];
                const dayAppointments = entry[1];
                console.log(`Verarbeite Routenaktualisierung für ${weekday} mit ${dayAppointments.length} HB-Terminen`);
                
                const weekdayLower = weekday.toLowerCase() as Weekday;
                
                // Finde Quell- und Zielrouten für diesen Tag
                const sourceRoute = allRoutesSnapshot.find(route => 
                    sourceEmployee && route.employee_id === sourceEmployee.id && route.weekday === weekdayLower
                );
                
                const targetRoute = allRoutesSnapshot.find(route => 
                    route.employee_id === targetEmployee.id && route.weekday === weekdayLower
                );
                
                // Verarbeite Routenaktualisierungen für diesen Tag
                if (dayAppointments.length > 0) {
                    // A) Erstelle Promise für Entfernen aus der Quellroute
                    const removePromises: Promise<any>[] = [];
                    if (sourceRoute && sourceRoute.id) {
                        const appointmentIdsToRemove = dayAppointments
                            .filter((a: Appointment) => a.id)
                            .map((a: Appointment) => a.id as number);
                        
                        console.log(`Entferne Termine aus Quellroute (${weekday}): ${appointmentIdsToRemove.join(', ')}`);
                        
                        if (appointmentIdsToRemove.length > 0) {
                            for (const appId of appointmentIdsToRemove) {
                                removePromises.push(
                                    removeFromRouteOrder(sourceRoute.id, appId)
                                        .then(async (updatedRoute) => {
                                            console.log(`Termin ${appId} erfolgreich aus Route ${sourceRoute.id} entfernt`);
                                            
                                            // Überprüfe, ob die Route jetzt leer ist
                                            const remainingOrder = Array.isArray(updatedRoute.route_order) 
                                                ? updatedRoute.route_order 
                                                : [];
                                            
                                            if (remainingOrder.length === 0 && sourceRoute.id) {
                                                // Wenn die Route leer ist, setze Distanz und Zeit auf 0
                                                console.log(`Route ${sourceRoute.id} ist jetzt leer. Setze Distanz und Zeit auf 0.`);
                                                try {
                                                    await updateRouteOrder(sourceRoute.id, []);
                                                    // Explizit Distanz und Zeit auf 0 setzen
                                                    await routesApi.updateRoute(sourceRoute.id, {
                                                        total_distance: 0,
                                                        total_duration: 0,
                                                        route_order: []
                                                    });
                                                } catch (error) {
                                                    console.error('Fehler beim Zurücksetzen der leeren Route:', error);
                                                }
                                            }
                                        })
                                        .catch((error: Error) => console.error(`Fehler beim Entfernen von Termin ${appId} aus Route:`, error))
                                );
                            }
                        }
                    }
                    
                    // B) Erstelle Promise für Hinzufügen zur Zielroute
                    let addPromise = Promise.resolve();
                    if (targetRoute && targetRoute.id) {
                        const appointmentIdsToAdd = dayAppointments
                            .filter((a: Appointment) => a.id)
                            .map((a: Appointment) => a.id as number);
                        
                        console.log(`Füge Termine zur Zielroute (${weekday}) hinzu: ${appointmentIdsToAdd.join(', ')}`);
                        
                        if (appointmentIdsToAdd.length > 0) {
                            // Hole die aktuelle Routen-Reihenfolge der Zielroute
                            let currentTargetRouteOrder: number[] = [];
                            
                            if (targetRoute.route_order) {
                                if (Array.isArray(targetRoute.route_order)) {
                                    currentTargetRouteOrder = targetRoute.route_order;
                                } else {
                                    try {
                                        const parsed = JSON.parse(targetRoute.route_order as unknown as string);
                                        currentTargetRouteOrder = Array.isArray(parsed) ? parsed : [];
                                    } catch (err) {
                                        console.error('Fehler beim Parsen der Zielroute:', err);
                                        currentTargetRouteOrder = [];
                                    }
                                }
                            }
                            
                            // Füge die neuen Termin-IDs am Ende der Zielroute hinzu
                            const updatedTargetRouteOrder = [...currentTargetRouteOrder, ...appointmentIdsToAdd];
                            
                            addPromise = updateRouteOrder(targetRoute.id, updatedTargetRouteOrder)
                                .then(() => console.log(`Zielroute (${weekday}) erfolgreich aktualisiert`))
                                .catch((error: Error) => console.error(`Fehler beim Aktualisieren der Zielroute (${weekday}):`, error));
                        }
                    }
                    
                    // Warte auf alle Quell- und Zielrouten-Operationen für diesen Tag
                    await Promise.all([...removePromises, addPromise]);
                    return { weekday, success: true };
                }
                
                return { weekday, success: false };
            });
            
            // Warte auf alle Routenaktualisierungen
            try {
                await Promise.all(updatePromises);
                console.log('Alle Routenaktualisierungen abgeschlossen');
                
                // Schritt 3.5: Refresh der Routen-Daten
                await refetchRoutes();
                
                // Aktualisiere die lokalen Routen mit den neuesten Daten
                setRoutes(prevRoutes => {
                    return prevRoutes.map(route => {
                        // Für die Quellroute: Wenn sie leer ist, setze Distanz und Zeit auf 0
                        if (sourceEmployee && route.employee_id === sourceEmployee.id && route.weekday === selectedDay.toLowerCase()) {
                            const routeOrder = Array.isArray(route.route_order) ? route.route_order : [];
                            if (routeOrder.length === 0) {
                                return {
                                    ...route,
                                    total_distance: 0,
                                    total_duration: 0,
                                    route_order: []
                                };
                            }
                        }
                        return route;
                    });
                });
            } catch (error) {
                console.error('Fehler bei der Aktualisierung der Routen:', error);
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Routen:', error);
        }
    };
    
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }
    
    if (error) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                {error}
            </Alert>
        );
    }
    
    if (patients.length === 0) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                Keine Patienten gefunden. Importieren Sie Patienten über den Excel Import.
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
            {activeEmployeesWithPatientsInTours.length > 0 ? (
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
                            patients={patients}
                            appointments={appointments}
                            selectedDay={selectedDay}
                            routes={routes}
                            onPatientMoved={handlePatientMoved}
                        />
                    ))}
                </Box>
            ) : (
                <Alert severity="info" sx={{ my: 2 }}>
                    Keine Touren mit aktiven Mitarbeitern und Patienten gefunden.
                </Alert>
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
                                patients={patients}
                                appointments={appointments}
                                selectedDay={selectedDay}
                                routes={routes}
                                onPatientMoved={handlePatientMoved}
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
                                patients={patients}
                                appointments={appointments}
                                selectedDay={selectedDay}
                                routes={routes}
                                onPatientMoved={handlePatientMoved}
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
                            
                            return (
                                <Tooltip 
                                    key={employee.id} 
                                    title={`Funktion: ${employee.function} - ${employee.is_active ? 'Aktiv' : 'Inaktiv'}`}
                                >
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<PersonIcon />}
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