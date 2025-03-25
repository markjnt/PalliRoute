import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { Patient, Appointment, Employee, Weekday, Route } from '../../types/models';
import { TourContainer } from './TourContainer';
import { Person as PersonIcon } from '@mui/icons-material';
import { routesApi } from '../../services/api';
import { useDrag } from '../../contexts/DragContext';

interface ToursViewProps {
    employees: Employee[];
    patients: Patient[];
    appointments: Appointment[];
    selectedDay: Weekday;
    loading: boolean;
    error: string | null;
}

export const ToursView: React.FC<ToursViewProps> = ({
    employees,
    patients: initialPatients,
    appointments: initialAppointments,
    selectedDay,
    loading,
    error
}) => {
    // Create local state to manage patients and appointments, allowing updates via drag and drop
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [routesLoading, setRoutesLoading] = useState<boolean>(false);
    const [routesError, setRoutesError] = useState<string | null>(null);
    
    // Get the drag context functions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatePatientTour, updateAppointmentEmployee, updateRouteOrder, removeFromRouteOrder } = useDrag();
    
    // Update local state when props change
    useEffect(() => {
        setPatients(initialPatients);
    }, [initialPatients]);
    
    useEffect(() => {
        setAppointments(initialAppointments);
    }, [initialAppointments]);
    
    // Methode zum Neuladen der Routes
    const fetchRoutes = async (weekday: Weekday) => {
        setRoutesLoading(true);
        setRoutesError(null);
        try {
            const weekdayLower = weekday.toLowerCase() as Weekday;
            const fetchedRoutes = await routesApi.getRoutes({ weekday: weekdayLower });
            setRoutes(fetchedRoutes);
            return fetchedRoutes;
        } catch (error) {
            console.error('Failed to fetch routes:', error);
            setRoutesError('Fehler beim Laden der Routen');
            return [];
        } finally {
            setRoutesLoading(false);
        }
    };
    
    // Load routes when selectedDay changes
    useEffect(() => {
        fetchRoutes(selectedDay);
    }, [selectedDay, initialAppointments]); // Auch neu laden, wenn die Appointments aktualisiert werden
    
    // Zusätzliche Abhängigkeit: Neu laden, wenn sich employees ändert (z.B. nach Import)
    useEffect(() => {
        if (employees.length > 0) {
            fetchRoutes(selectedDay);
        }
    }, [employees, selectedDay]);
    
    // Get employees with tour numbers
    const employeesWithTours = [...employees]
        .filter(e => e.tour_number)
        .sort((a, b) => {
            if (!a.tour_number || !b.tour_number) return 0;
            return a.tour_number - b.tour_number;
        });
    
    // Get employees without tour numbers
    const employeesWithoutTours = employees.filter(e => !e.tour_number);
    
    /**
     * Handler für den Fall, dass ein Patient in eine andere Tour verschoben wird
     * 
     * Wird von TourContainer.tsx aufgerufen (Schritt 3 im Verschiebungsprozess)
     * Führt die komplexe Aktualisierung der Routen-Reihenfolge durch (Schritt 4)
     */
    const handlePatientMoved = async (movedPatient: Patient, newTourNumber: number) => {
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
        
        // Schritt 4: Aktualisiere die Routen-Reihenfolgen für den aktuellen Tag
        try {
            const weekday = selectedDay.toLowerCase();
            console.log(`Aktualisiere Routen für Wochentag: ${weekday}`);
            
            // Finde Quell- und Zielrouten für den ausgewählten Tag
            const sourceRoute = routes.find(r => 
                sourceEmployee && r.employee_id === sourceEmployee.id && r.weekday === weekday
            );
            
            const targetRoute = routes.find(r => 
                r.employee_id === targetEmployee.id && r.weekday === weekday
            );
            
            console.log('Quellroute:', sourceRoute);
            console.log('Zielroute:', targetRoute);
            
            // Finde alle HB-Termine für diesen Patienten am ausgewählten Tag
            const dayAppointments = appointments.filter(
                a => a.patient_id === movedPatient.id && a.weekday === selectedDay
            );
            
            const hbAppointments = dayAppointments.filter(a => a.visit_type === 'HB');
            console.log(`HB-Termine für Patient am ${selectedDay}:`, hbAppointments);
            
            // Verarbeite nur HB-Termine, da nur diese in Routen-Reihenfolgen enthalten sind
            if (hbAppointments.length > 0) {
                // Schritt 4.1: Aktualisiere Quellroute (entferne Termine aus der Quellroute)
                if (sourceRoute && sourceRoute.id) {
                    const appointmentIdsToRemove = hbAppointments
                        .filter(a => a.id)
                        .map(a => a.id as number);
                    
                    console.log(`Entferne Termine aus Quellroute: ${appointmentIdsToRemove.join(', ')}`);
                    
                    // Verwende removeFromRouteOrder, um jeden Termin einzeln zu aktualisieren
                    if (appointmentIdsToRemove.length > 0) {
                        for (const appId of appointmentIdsToRemove) {
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const updatedRoute = await removeFromRouteOrder(sourceRoute.id, appId);
                                console.log(`Termin ${appId} erfolgreich aus Route ${sourceRoute.id} entfernt`);
                            } catch (error) {
                                console.error(`Fehler beim Entfernen von Termin ${appId} aus Route ${sourceRoute.id}:`, error);
                            }
                        }
                    }
                }
                
                // Schritt 4.2: Aktualisiere Zielroute (füge Termine zur Zielroute hinzu)
                if (targetRoute && targetRoute.id) {
                    const appointmentIdsToAdd = hbAppointments
                        .filter(a => a.id)
                        .map(a => a.id as number);
                    
                    console.log(`Füge Termine zur Zielroute hinzu: ${appointmentIdsToAdd.join(', ')}`);
                    
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
                        
                        console.log('Aktuelle Zielroute:', currentTargetRouteOrder);
                        
                        // Füge die neuen Termin-IDs am Ende der Zielroute hinzu
                        const updatedTargetRouteOrder = [...currentTargetRouteOrder, ...appointmentIdsToAdd];
                        console.log('Aktualisierte Zielroute:', updatedTargetRouteOrder);
                        
                        // Aktualisiere die Zielroute mit der neuen Reihenfolge
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const updatedRoute = await updateRouteOrder(targetRoute.id, updatedTargetRouteOrder);
                            console.log('Zielroute erfolgreich aktualisiert');
                        } catch (error) {
                            console.error('Fehler beim Aktualisieren der Zielroute:', error);
                        }
                    }
                }
                
                // Schritt 5: Lade die Routen neu, um die Änderungen zu reflektieren
                try {
                    const weekdayForApi = selectedDay.toLowerCase() as Weekday;
                    console.log(`Lade Routen für ${weekdayForApi} neu`);
                    const updatedRoutes = await routesApi.getRoutes({ weekday: weekdayForApi });
                    setRoutes(updatedRoutes);
                    console.log(`${updatedRoutes.length} Routen neu geladen`);
                } catch (error) {
                    console.error('Fehler beim Neuladen der Routen:', error);
                    setRoutesError('Fehler beim Neuladen der Routen-Reihenfolge');
                }
            } else {
                console.log('Keine HB-Termine gefunden, keine Routenaktualisierung notwendig');
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Routen:', error);
            setRoutesError('Fehler beim Aktualisieren der Routen-Reihenfolge');
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
            {routesLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2, pb: 2 }}>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        Lade Routeninformationen...
                    </Typography>
                </Box>
            )}
            
            {routesError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {routesError} - Die Routenreihenfolge wird möglicherweise nicht korrekt angezeigt.
                </Alert>
            )}

            {/* Display tour containers for employees with tour numbers */}
            {employeesWithTours.length > 0 ? (
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
                    {employeesWithTours.map(employee => (
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
                    Keine Touren gefunden. Bitte weisen Sie den Mitarbeitern Tournummern zu.
                </Alert>
            )}
            
            {/* Display employees without tour numbers */}
            {employeesWithoutTours.length > 0 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon />
                        Mitarbeiter ohne Tour-Zuweisung
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {employeesWithoutTours.map(employee => (
                            <Button
                                key={employee.id}
                                variant="outlined"
                                size="small"
                                startIcon={<PersonIcon />}
                                sx={{ mr: 1, mb: 1 }}
                            >
                                {employee.first_name} {employee.last_name}
                            </Button>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}; 