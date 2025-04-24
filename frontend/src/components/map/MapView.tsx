import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button, Typography, IconButton, Tooltip, Card, CardContent, Chip } from '@mui/material';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer, InfoWindow, GroundOverlay } from '@react-google-maps/api';
import { configApi } from '../../services/api/config';
import { routesApi } from '../../services/api/routes';
import { appointmentsApi } from '../../services/api/appointments';
import { Route, Patient, Appointment, Employee, Weekday } from '../../types/models';
import { useWeekdayStore } from '../../stores';
import { useTheme } from '@mui/material/styles';
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material';
import { appointmentTypeColors, employeeTypeColors, routeLineColors, getColorForTour } from '../../utils/colors';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 51.0267, // Gummersbach
    lng: 7.5683
};

const defaultZoom = 10;

// Define libraries as a constant outside the component
const libraries: ("places" | "geocoding")[] = ['places', 'geocoding'];

// Map options
const mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false
};

// Map weekday names (English to German)
const weekdayMap: Record<string, string> = {
    'monday': 'Montag',
    'tuesday': 'Dienstag',
    'wednesday': 'Mittwoch',
    'thursday': 'Donnerstag',
    'friday': 'Freitag',
    'saturday': 'Samstag',
    'sunday': 'Sonntag'
};

// Get current weekday in lowercase English (e.g., 'monday')
const getCurrentWeekday = (): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    return days[today];
};

export const MapView: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const { selectedWeekday } = useWeekdayStore();
    const theme = useTheme();

    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                // Get API key
                const key = await configApi.getGoogleMapsApiKey();
                setApiKey(key);
            } catch (err) {
                setError('Fehler beim Laden des API-Schlüssels');
                console.error('Error fetching API key:', err);
            }
        };
        fetchApiKey();
    }, []);

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!apiKey) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    return <MapContent 
        apiKey={apiKey} 
        selectedWeekday={selectedWeekday}
    />;
};

interface MapContentProps {
    apiKey: string;
    selectedWeekday: string;
}

interface MarkerData {
    position: google.maps.LatLng;
    title: string;
    label?: string;
    type: 'employee' | 'patient';
    visitType?: string; // HB, TK, or NA
    employeeType?: string; // Job title for employees
    patientId?: number; // Added patient ID for identifying patients
    appointmentId?: number; // Added appointment ID for matching route_order
    employeeId?: number; // Added employee ID for identifying employees
    routePosition?: number; // Position in the route (1-based index)
    displayPosition?: google.maps.LatLng; // Position to show InfoWindow at (for expanded markers)
}

interface RoutePathData {
    employeeId: number;
    routeId: number; // Hinzugefügt für eindeutige Identifizierung
    routeOrder: number[];
    color: string;
    directions: google.maps.DirectionsResult | null;
    loading: boolean;
    error: boolean;
    totalDistance?: string;        // Gesamtdistanz
    drivingTime?: string;          // Reine Fahrzeit
    totalTime?: string;            // Gesamtzeit inkl. Besuchszeiten
    visitTime?: string;            // Gesamte Besuchszeit
    employeeName?: string;         // Name des Mitarbeiters für Hover-Info
    appointments?: {
        id: number;
        visitType?: string;
        duration: number;
    }[];
}

// Hilfsfunktion zum Parsen der route_order
const parseRouteOrder = (routeOrder: any): number[] => {
    if (Array.isArray(routeOrder)) {
        return routeOrder;
    }
    
    try {
        const parsed = JSON.parse(routeOrder as string);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse route_order:', error);
        return [];
    }
};

// Hilfsfunktion um zu prüfen, ob eine Route gültig ist
const isValidRoute = (route: Route): boolean => {
    const routeOrder = parseRouteOrder(route.route_order);
    return routeOrder.length > 0;
};

// Add this new interface for marker grouping
interface MarkerGroup {
    markers: MarkerData[];
    position: google.maps.LatLng;
    count: number;
}

// Replace the adjustOverlappingMarkers function with this new approach
const groupMarkersByPosition = (markers: MarkerData[]): MarkerGroup[] => {
    // Create a map to track positions and markers at each position
    const positionGroups = new Map<string, MarkerGroup>();
    
    // Group markers by exact position
    markers.forEach(marker => {
        const posKey = `${marker.position.lat()},${marker.position.lng()}`;
        
        if (positionGroups.has(posKey)) {
            // Add marker to existing group
            const group = positionGroups.get(posKey)!;
            group.markers.push(marker);
            group.count += 1;
        } else {
            // Create new group for this position
            positionGroups.set(posKey, {
                markers: [marker],
                position: marker.position,
                count: 1
            });
        }
    });
    
    // Convert map to array of groups
    return Array.from(positionGroups.values());
};

const MapContent: React.FC<MapContentProps> = ({ apiKey, selectedWeekday }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries,
        language: 'de',
        region: 'DE'
    });
    const theme = useTheme();
    
    // Ref to track if we're currently calculating routes
    const isCalculatingRoutes = React.useRef(false);

    const [map, setMap] = React.useState<google.maps.Map | null>(null);
    const [markers, setMarkers] = React.useState<MarkerData[]>([]);
    const [mapError, setMapError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    
    // State for tracking open popup
    const [selectedMarker, setSelectedMarker] = React.useState<MarkerData | null>(null);
    
    // State for actual data
    const [routes, setRoutes] = React.useState<Route[]>([]);
    const [allRoutes, setAllRoutes] = React.useState<Route[]>([]);
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    
    const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
    
    const [routePaths, setRoutePaths] = React.useState<RoutePathData[]>([]);
    
    // Add a state for tracking marker groups
    const [markerGroups, setMarkerGroups] = React.useState<MarkerGroup[]>([]);
    const [activeGroup, setActiveGroup] = React.useState<string | null>(null);
    
    // React Query Hooks
    const { 
        data: employees = [], 
        isLoading: employeesLoading 
    } = useEmployees();
    
    const {
        data: patients = [],
        isLoading: patientsLoading,
        error: patientsError
    } = usePatients();

    // Fetch all necessary data
    const fetchData = React.useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        if (!showLoading) setIsRefreshing(true);
        
        // Routenpfade zurücksetzen und Berechnungen stoppen
        setRoutePaths([]);
        isCalculatingRoutes.current = false;
        
        try {
            // Fetch all routes with route_order
            const routesData = await routesApi.getRoutes();
            setAllRoutes(routesData);
            
            // Filter routes for the selected weekday
            const weekdayRoutes = routesData.filter(r => 
                r.weekday && r.weekday.toLowerCase() === selectedWeekday.toLowerCase()
            );
            setRoutes(weekdayRoutes);
            
            // Fetch appointments for the selected weekday
            const appointmentsData = await appointmentsApi.getByWeekday(selectedWeekday as Weekday);
            setAppointments(appointmentsData);
            
            // Patienten und Mitarbeiter werden jetzt über React Query geladen
            
            setLastRefreshed(new Date());
            
            // Send global data refreshed event
            // (Other components like ToursView listen for this)
            const event = new CustomEvent('palliRoute:dataRefreshed');
            window.dispatchEvent(event);
        } catch (err) {
            console.error('Error fetching data:', err);
            setMapError('Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.');
        } finally {
            if (showLoading) setLoading(false);
            if (!showLoading) setIsRefreshing(false);
        }
    }, [selectedWeekday]);
    
    // Kombinierter Ladestatus
    const isDataLoading = loading || employeesLoading || patientsLoading || isRefreshing;
    
    // Initial data fetch
    React.useEffect(() => {
        if (isLoaded) {
            // Routenpfade komplett zurücksetzen vor dem Datenabruf
            isCalculatingRoutes.current = false;
            setRoutePaths([]);
            fetchData(true);
        }
    }, [isLoaded, fetchData]);
    
    // Handle manual refresh - Optimiert, um Doppelberechnungen zu vermeiden
    const handleRefresh = () => {
        // Deaktiviere laufende Berechnungen und leere Routen
        isCalculatingRoutes.current = false;
        // Zurücksetzen der Routenpfade vor dem Datenabruf
        setRoutePaths([]);
        // Dann Daten abrufen
        fetchData(false);
    };
    
    // Filter routes when selected weekday changes
    React.useEffect(() => {
        if (allRoutes.length > 0) {
            // Erst Routenpfade zurücksetzen, dann neue Routen setzen
            setRoutePaths([]);
            isCalculatingRoutes.current = false;
            
            // Filtere Routen für den ausgewählten Tag UND nur gültige Routen mit nicht-leerer route_order
            const filteredRoutes = allRoutes.filter(route => 
                route.weekday === selectedWeekday && isValidRoute(route)
            );
            
            setRoutes(filteredRoutes);
            
            // Log für Debugging
            console.log(`${filteredRoutes.length} gültige Routen für ${selectedWeekday} gefunden`);
        }
    }, [selectedWeekday, allRoutes]);
    
    // Update the React.useEffect where you create markers to reset the activeGroup when selectedWeekday changes
    React.useEffect(() => {
        // Reset active group and selected marker when weekday changes
        setActiveGroup(null);
        setSelectedMarker(null);
    }, [selectedWeekday]);

    // Update the React.useEffect where you create markers to ensure proper dependency array
    React.useEffect(() => {
        const createMarkers = async () => {
            if (!window.google || !window.google.maps || !map) {
                return;
            }
            
            setLoading(true);
            const newMarkers: MarkerData[] = [];
            
            try {
                // Create employee markers for all active employees
                if (employees.length > 0) {
                    const activeEmployees = employees.filter(e => e.is_active);
                    for (const employee of activeEmployees) {
                        const employeeMarkerData = createEmployeeMarkerData(employee);
                        if (employeeMarkerData) newMarkers.push(employeeMarkerData);
                    }
                }
                
                // Only create patient markers if we have both patients and appointments
                if (patients.length > 0 && appointments.length > 0) {
                    // Get all appointments for the selected day with a non-empty visit_type
                    const appointmentsForDay = appointments.filter(appointment => 
                        appointment.weekday === selectedWeekday && 
                        appointment.visit_type && 
                        appointment.visit_type.trim() !== ''
                    );
                    
                    // Get all routes for the selected day to determine patient positions
                    const routesForDay = routes.filter(route => route.weekday === selectedWeekday);
                    
                    // Create a map of appointment IDs to their position in the route
                    const appointmentPositions = new Map<number, number>();
                    
                    // Process all routes for the day to find positions of appointments
                    routesForDay.forEach(route => {
                        const routeOrder = parseRouteOrder(route.route_order);
                        routeOrder.forEach((appointmentId, index) => {
                            appointmentPositions.set(appointmentId, index + 1); // 1-based position
                        });
                    });
                    
                    // Create patient markers for all appointments (HB, TK, and NA) on this day
                    for (const appointment of appointmentsForDay) {
                        const patient = patients.find(p => p.id === appointment.patient_id);
                        if (patient) {
                            const position = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
                            const patientMarkerData = createPatientMarkerData(patient, appointment, position);
                            if (patientMarkerData) newMarkers.push(patientMarkerData);
                        }
                    }
                }
                
                // Instead of adjusting positions, just group markers by position
                setMarkers(newMarkers);
                
            } catch (err) {
                console.error('Error creating markers:', err);
                setMapError('Fehler beim Erstellen der Marker');
            } finally {
                setLoading(false);
            }
        };
        
        createMarkers();
        
        // Add routes to dependency array to ensure markers update when routes change
    }, [selectedWeekday, employees, patients, appointments, map, routes]);
    
    // Create employee marker data using latitude and longitude from backend
    const createEmployeeMarkerData = (employee: Employee): MarkerData | null => {
        // Check if we have latitude and longitude from the backend
        if (employee.latitude && employee.longitude) {
            // Create position using coordinates from backend
            const position = new google.maps.LatLng(employee.latitude, employee.longitude);
            
            return {
                position,
                title: `${employee.first_name} ${employee.last_name} - ${employee.function || 'Mitarbeiter'}`,
                type: 'employee',
                employeeType: employee.function,
                employeeId: employee.id // Add employee ID to marker data
            };
        } else {
            // If no coordinates, log warning and skip
            console.warn(`No coordinates for employee: ${employee.first_name} ${employee.last_name}`);
            return null;
        }
    };
    
    // Create patient marker data with appointment type and position using latitude and longitude from backend
    const createPatientMarkerData = (patient: Patient, appointment: Appointment, position?: number): MarkerData | null => {
        // Check if we have latitude and longitude from the backend
        if (patient.latitude && patient.longitude) {
            // Create position using coordinates from backend
            const position_coords = new google.maps.LatLng(patient.latitude, patient.longitude);
            
            // If it's a HB (home visit) appointment and has a position, use it as the label
            const label = appointment.visit_type === 'HB' && position ? position.toString() : undefined;
            
            return {
                position: position_coords,
                title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type}`,
                type: 'patient',
                label,
                visitType: appointment.visit_type,
                patientId: patient.id, // Add patient ID to marker data
                appointmentId: appointment.id, // Add appointment ID to marker data
                routePosition: position // Add the position in the route
            };
        } else {
            // If no coordinates, log warning and skip
            console.warn(`No coordinates for patient: ${patient.first_name} ${patient.last_name}`);
            return null;
        }
    };

    const onLoad = React.useCallback((map: google.maps.Map) => {
        setMap(map);
        
        // Komplett Routenpfade zurücksetzen beim Laden der Karte
        isCalculatingRoutes.current = false;
        setRoutePaths([]);
        
        // Create a custom style for the map markers with position numbers
        const customLabelStyle = document.createElement('style');
        customLabelStyle.textContent = `
            .gm-style .gm-style-iw {
                font-weight: bold;
            }
            .gm-style-mtvbg {
                color: white !important;
                font-weight: bold !important;
                font-family: Arial, sans-serif !important;
            }
        `;
        document.head.appendChild(customLabelStyle);
    }, []);

    const onUnmount = React.useCallback(() => {
        // Beim Unmount alle Daten zurücksetzen
        setMarkers([]);
        setRoutePaths([]);
        isCalculatingRoutes.current = false;
        setMap(null);
    }, []);

    // Get color for appointment type
    const getColorForVisitType = (visitType?: string): string => {
        if (!visitType) return appointmentTypeColors.default;
        return appointmentTypeColors[visitType] || appointmentTypeColors.default;
    };
    
    // Get color for employee type
    const getColorForEmployeeType = (employeeType?: string): string => {
        if (!employeeType) return employeeTypeColors.default;
        
        if (employeeType.includes('Arzt') && !employeeType.includes('Honorar')) {
            return employeeTypeColors['Arzt'];
        } else if (employeeType.includes('Honorararzt')) {
            return employeeTypeColors['Honorararzt'];
        }
        
        return employeeTypeColors.default;
    };

    // Neuimplementierte Funktion: Umfassende Überprüfung ob Route-Order gültig ist
    const hasValidRouteOrder = (route: Route): boolean => {
        // 1. Parse route_order
        const routeOrder = parseRouteOrder(route.route_order);
        
        // 2. Prüfe ob Array existiert und nicht leer ist
        if (!routeOrder || routeOrder.length === 0) {
            return false;
        }
        
        // 3. Prüfe ob alle IDs in routeOrder auch als Appointments existieren
        const appointmentsExist = routeOrder.every(appointmentId => {
            return appointments.some(appointment => 
                appointment.id === appointmentId && 
                appointment.weekday === selectedWeekday
            );
        });
        
        return appointmentsExist;
    };

    // Kombinierter useEffect für Routenanlegung und Berechnung
    React.useEffect(() => {
        // Frühe Rückgabe, wenn notwendige Daten fehlen
        if (!map || routes.length === 0 || markers.length === 0 || appointments.length === 0) {
            console.log("Fehlende Daten für Routenberechnung, setze routePaths zurück");
            setRoutePaths([]);
            isCalculatingRoutes.current = false;
            return;
        }
        
        // Verhindere doppelte Berechnung
        if (isCalculatingRoutes.current) {
            console.log("Berechnungen laufen bereits, überspringe...");
            return;
        }
        
        // Finde Routen mit leerer route_order und setze total_duration auf 0
        const emptyRoutes = routes.filter(route => !hasValidRouteOrder(route));
        if (emptyRoutes.length > 0) {
            console.log(`${emptyRoutes.length} Routen mit leerer route_order gefunden`);
        }
        
        // Filtere Routen erneut, um sicherzustellen, dass nur gültige Routen verwendet werden
        const validRoutes = routes.filter(route => hasValidRouteOrder(route));
        
        if (validRoutes.length === 0) {
            console.log("Keine gültigen Routen mit nicht-leerer route_order gefunden");
            setRoutePaths([]);
            isCalculatingRoutes.current = false;
            return;
        }
        
        console.log(`Initialisiere und berechne ${validRoutes.length} gültige Routen für ${selectedWeekday}`);
        
        // Markiere, dass wir jetzt Routen berechnen
        isCalculatingRoutes.current = true;
        
        // Ein Set, um zu verfolgen, für welche Routen bereits Berechnungen durchgeführt wurden
        const calculatedRouteIds = new Set<number>();
        
        // Erstelle initiale Routenpfade und berechne sie in einem Schritt
        const initializeAndCalculateRoutes = async () => {
            try {
                // Erstelle Routenpfade - erst alte komplett leeren
                setRoutePaths([]);
                
                // Erstelle neue Routenpfade nur für Routen mit gültiger route_order
                const newRoutePaths: RoutePathData[] = validRoutes.map((route, index) => {
                    const routeOrder = parseRouteOrder(route.route_order);
                    
                    // Finde den Mitarbeiternamen für die Hover-Information
                    const employee = employees.find(e => e.id === route.employee_id);
                    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unbekannter Mitarbeiter';
                    
                    // Verwende die GLEICHE Farbzuweisungslogik wie im TourContainer (getColorForTour)
                    // Das stellt sicher, dass die Farbe mit dem TourContainer übereinstimmt
                    const tourNumber = employee?.tour_number;
                    let color = '#9E9E9E'; // Default grey for undefined tour
                    
                    if (tourNumber) {
                        // Ensure tourNumber is a positive number and convert to zero-based index
                        const index = (Math.abs(tourNumber) - 1) % routeLineColors.length;
                        color = routeLineColors[index];
                    }
                    
                    return {
                        employeeId: route.employee_id,
                        routeId: route.id, // Speichere route.id für eindeutige Identifizierung
                        routeOrder: routeOrder,
                        color: color,
                        directions: null,
                        loading: false,
                        error: false,
                        totalDistance: undefined,
                        totalTime: undefined,
                        employeeName: employeeName // Speichere den Mitarbeiternamen für die Hover-Info
                    };
                });
                
                // Setze initiale Routen direkt
                setRoutePaths(newRoutePaths);
                
                // Berechne Directions für alle Routen
                for (let i = 0; i < newRoutePaths.length; i++) {
                    await calculateDirections(i, newRoutePaths);
                }
                
            } catch (error) {
                console.error("Fehler bei der Routenberechnung:", error);
            } finally {
                // Setze Berechnungsstatus zurück
                isCalculatingRoutes.current = false;
            }
        };
        
        // Funktion zum Berechnen einer einzelnen Route
        const calculateDirections = async (routeIndex: number, updatedRoutePaths: RoutePathData[]) => {
            const routePath = updatedRoutePaths[routeIndex];
            
            // Nochmals explizit prüfen, ob die Route-Order leer ist
            if (!routePath.routeOrder || routePath.routeOrder.length === 0) {
                console.log(`Leere route_order für Route ${routePath.routeId}, überspringe.`);
                updatedRoutePaths[routeIndex] = {
                    ...routePath,
                    error: true
                };
                setRoutePaths([...updatedRoutePaths]);
                return;
            }
            
            // Skip if already loading, already has directions or has an error
            if (routePath.loading || routePath.directions || routePath.error) {
                return;
            }
            
            // Finde die Route-ID basierend auf dem Employee
            const routeData = routes.find(r => r.id === routePath.routeId);
            
            // Überprüfe, ob diese Route bereits berechnet wurde
            if (routeData && routeData.id && calculatedRouteIds.has(routeData.id)) {
                console.log(`Route ${routeData.id} wurde bereits berechnet, überspringe.`);
                return;
            }

            // Markiere diese Route als berechnet
            if (routeData && routeData.id) {
                calculatedRouteIds.add(routeData.id);
            }

            // Find the employee marker for this route
            const employeeMarker = markers.find(
                marker => marker.type === 'employee' && marker.employeeId === routePath.employeeId
            );
            
            if (!employeeMarker) {
                console.log(`Kein Mitarbeiter-Marker für Route ${routePath.routeId} gefunden.`);
                updatedRoutePaths[routeIndex] = {
                    ...routePath,
                    error: true
                };
                setRoutePaths([...updatedRoutePaths]);
                return;
            }

            // Find all patient markers in route_order
            const waypoints: google.maps.DirectionsWaypoint[] = [];
            const validPatientMarkers: MarkerData[] = [];
            
            for (const appointmentId of routePath.routeOrder) {
                const patientMarker = markers.find(
                    marker => marker.type === 'patient' && marker.appointmentId === appointmentId
                );
                
                if (patientMarker) {
                    validPatientMarkers.push(patientMarker);
                    waypoints.push({
                        location: patientMarker.position,
                        stopover: true
                    });
                }
            }
            
            // Skip if no valid patient markers
            if (!validPatientMarkers.length) {
                console.log(`Keine gültigen Patientenmarker für Route ${routePath.routeId} gefunden.`);
                updatedRoutePaths[routeIndex] = {
                    ...routePath,
                    error: true
                };
                setRoutePaths([...updatedRoutePaths]);
                return;
            }

            // Mark as loading
            updatedRoutePaths[routeIndex] = {
                ...routePath,
                loading: true
            };
            setRoutePaths([...updatedRoutePaths]);

            // Use DirectionsService directly
            const directionsService = new google.maps.DirectionsService();

            try {
                const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
                    directionsService.route({
                        origin: employeeMarker.position,
                        destination: employeeMarker.position, // Return to start
                        waypoints: waypoints,
                        optimizeWaypoints: false, // We already have the order
                        travelMode: google.maps.TravelMode.DRIVING,
                        provideRouteAlternatives: false,
                        drivingOptions: {
                            departureTime: new Date(), // Now
                            trafficModel: google.maps.TrafficModel.BEST_GUESS
                        }
                    }, (result, status) => {
                        if (status === google.maps.DirectionsStatus.OK && result) {
                            resolve(result);
                        } else {
                            reject(new Error(`Directions request failed: ${status}`));
                        }
                    });
                });

                // Berechne Gesamtdistanz, Fahrzeit und Besuchszeiten
                if (result && result.routes && result.routes.length > 0) {
                    const routeResult = result.routes[0];
                    
                    // Berechne Distanz und Fahrzeit
                    let totalDistanceValue = 0;
                    let totalDurationValue = 0;
                    let totalVisitDuration = 0;
                    
                    // Berechne Besuchsdauer
                    validPatientMarkers.forEach(marker => {
                        const appointmentId = marker.appointmentId || 0;
                        const appointment = appointments.find(a => a.id === appointmentId);
                        const duration = (appointment && appointment.duration) ? appointment.duration : 0;
                        totalVisitDuration += duration;
                    });
                    
                    // Berechne Distanz und Fahrzeit aus den Legs
                    if (routeResult.legs) {
                        routeResult.legs.forEach(leg => {
                            if (leg.distance && leg.distance.value) {
                                totalDistanceValue += leg.distance.value;
                            }
                            if (leg.duration && leg.duration.value) {
                                totalDurationValue += leg.duration.value;
                            }
                        });
                    }
                    
                    // Konvertiere Distanz von Metern in Kilometer
                    const distanceKm = totalDistanceValue / 1000;
                    
                    // Konvertiere Fahrzeit von Sekunden in Minuten
                    const drivingTimeMinutes = Math.round(totalDurationValue / 60);
                    
                    // Berechne die Gesamtzeit (Fahrzeit + Besuchszeit)
                    const totalTimeMinutes = drivingTimeMinutes + totalVisitDuration;
                    
                    // Aktualisiere die Route mit allen berechneten Werten (für UI)
                    updatedRoutePaths[routeIndex] = {
                        ...updatedRoutePaths[routeIndex],
                        directions: result,
                        totalDistance: `${distanceKm.toFixed(1)} km`,
                        totalTime: totalTimeMinutes >= 60 
                            ? `${Math.floor(totalTimeMinutes / 60)}h ${totalTimeMinutes % 60}min` 
                            : `${totalTimeMinutes}min`,
                        loading: false
                    };
                    // Speichere nur die beiden wichtigen Werte im Backend
                    if (routeData && routeData.id) {
                        try {
                            // Speichere die Werte im Backend
                            await routesApi.updateRoute(routeData.id, {
                                total_distance: distanceKm,
                                total_duration: totalTimeMinutes
                            });
                            
                            console.log(`Route ${routeData.id} aktualisiert: ${distanceKm}km, ${totalTimeMinutes}min`);
                            
                            // Dispatch a custom event to notify other components that a route was updated
                            const routeUpdateEvent = new CustomEvent('palliRoute:routeUpdated', {
                                detail: { 
                                    routeId: routeData.id,
                                    employeeId: routeData.employee_id,
                                    weekday: selectedWeekday,
                                    totalDistance: distanceKm,
                                    totalDuration: totalTimeMinutes
                                }
                            });
                            window.dispatchEvent(routeUpdateEvent);
                            
                        } catch (error) {
                            console.error(`Fehler beim Speichern der Route ${routeData.id}:`, error);
                        }
                    }
                }
                
                // Aktualisiere state
                setRoutePaths([...updatedRoutePaths]);
            } catch (error) {
                console.error(`Error calculating directions for route ${routeIndex}:`, error);
                updatedRoutePaths[routeIndex] = {
                    ...routePath,
                    loading: false,
                    error: true
                };
                setRoutePaths([...updatedRoutePaths]);
            }
        };

        // Starte den gesamten Prozess
        initializeAndCalculateRoutes();
        
    }, [map, routes, markers, appointments, selectedWeekday]);

    // Add useEffect to update marker groups when markers change
    React.useEffect(() => {
        if (markers.length > 0) {
            setMarkerGroups(groupMarkersByPosition(markers));
        } else {
            setMarkerGroups([]);
        }
    }, [markers]);

    if (!isLoaded || isDataLoading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ 
            height: '100%', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Map Controls */}
            <Box sx={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                zIndex: 10, 
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: 1,
                padding: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end'
            }}>
                <Tooltip title="Daten aktualisieren">
                    <IconButton 
                        onClick={handleRefresh} 
                        disabled={isRefreshing}
                        size="small"
                        sx={{ mb: 1 }}
                    >
                        {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    Letztes Update: {lastRefreshed.toLocaleTimeString()}
                </Typography>
            </Box>
            
            {/* Loading indicator */}
            {loading && (
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}>
                    <CircularProgress />
                </Box>
            )}
            
            {/* Error display */}
            {mapError && (
                <Box sx={{ p: 2 }}>
                    <Typography color="error">{mapError}</Typography>
                    <Button 
                        variant="contained" 
                        sx={{ mt: 1 }} 
                        onClick={() => fetchData(true)}
                    >
                        Erneut versuchen
                    </Button>
                </Box>
            )}
            
            {/* Google Map */}
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={defaultZoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
            >
                {/* Render directions - mit besseren unique keys und EXTRA Prüfung auf nicht-leere routeOrder */}
                {routePaths.map((routePath, index) => (
                    routePath.directions && 
                    routePath.routeOrder && 
                    routePath.routeOrder.length > 0 ? (
                        <DirectionsRenderer
                            key={`route-${routePath.routeId}-${selectedWeekday}-${lastRefreshed.getTime()}`}
                            directions={routePath.directions}
                            options={{
                                suppressMarkers: true, // Don't show default markers
                                preserveViewport: true, // Prevent automatic zooming and panning
                                polylineOptions: {
                                    strokeColor: routePath.color,
                                    strokeOpacity: 1.0,
                                    strokeWeight: 5
                                }
                            }}
                        />
                    ) : null
                ))}
                
                {/* Render marker groups */}
                {markerGroups.map((group, groupIndex) => {
                    // Generate a unique key for this group
                    const groupKey = `${group.position.lat()},${group.position.lng()}`;
                    const isGroupActive = activeGroup === groupKey;
                    
                    return (
                        <React.Fragment key={`group-${groupIndex}`}>
                            {/* Render either a single marker or expanded group */}
                            {group.count === 1 || !isGroupActive ? (
                                // For single markers or collapsed groups, show just one marker
                                <Marker
                                    key={`group-marker-${groupIndex}`}
                                    position={group.position}
                                    title={group.count > 1 ? `${group.count} Marker an dieser Position` : group.markers[0].title}
                                    onClick={() => {
                                        // If multiple markers at this position, expand the group
                                        if (group.count > 1) {
                                            setActiveGroup(groupKey);
                                        } else {
                                            // If only one marker, select it directly
                                            setSelectedMarker(group.markers[0]);
                                        }
                                    }}
                                    label={group.count > 1 ? {
                                        text: group.count.toString(),
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '12px'
                                    } : group.markers[0].type === 'employee' ? undefined : 
                                    // Only create a label object for HB appointments with position numbers
                                    (group.markers[0].visitType === 'HB' && group.markers[0].label) ? {
                                        text: group.markers[0].label || '',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    } : undefined}
                                    icon={group.count > 1 ? {
                                        // Use a different style for multi-marker groups
                                        path: google.maps.SymbolPath.CIRCLE,
                                        fillColor: '#4285F4', // Google Blue for multi-marker groups
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 2,
                                        scale: 15, // Slightly larger for groups
                                    } : group.markers[0].type === 'employee' ? {
                                        path: google.maps.SymbolPath.CIRCLE,
                                        fillColor: getColorForEmployeeType(group.markers[0].employeeType),
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 2,
                                        scale: 12,
                                    } : {
                                        path: google.maps.SymbolPath.CIRCLE,
                                        fillColor: getColorForVisitType(group.markers[0].visitType),
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 2,
                                        scale: 12,
                                    }}
                                />
                            ) : (
                                // When group is active, expand markers in a circle
                                group.markers.map((marker, idx) => {
                                    // Calculate position in a circle around the original point
                                    const angle = (2 * Math.PI * idx) / group.markers.length;
                                    const radius = 0.0001; // About 10 meters radius
                                    const lat = group.position.lat() + Math.cos(angle) * radius;
                                    const lng = group.position.lng() + Math.sin(angle) * radius;
                                    const expandedPosition = new google.maps.LatLng(lat, lng);
                                    
                                    // Create a copy of the marker with the display position set
                                    const markerWithDisplayPosition = {
                                        ...marker,
                                        displayPosition: expandedPosition
                                    };
                                    
                                    return (
                                        <Marker
                                            key={`expanded-marker-${groupIndex}-${idx}`}
                                            position={expandedPosition}
                                            title={marker.title}
                                            onClick={() => {
                                                setSelectedMarker(markerWithDisplayPosition);
                                            }}
                                            label={marker.type === 'employee' ? undefined : 
                                            // Only create a label object for HB appointments with position numbers
                                            (marker.visitType === 'HB' && marker.label) ? {
                                                text: marker.label || '',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '14px'
                                            } : undefined}
                                            icon={marker.type === 'employee' ? {
                                                path: google.maps.SymbolPath.CIRCLE,
                                                fillColor: getColorForEmployeeType(marker.employeeType),
                                                fillOpacity: 1,
                                                strokeColor: '#ffffff',
                                                strokeWeight: 2,
                                                scale: 12,
                                            } : {
                                                path: google.maps.SymbolPath.CIRCLE,
                                                fillColor: getColorForVisitType(marker.visitType),
                                                fillOpacity: 1,
                                                strokeColor: '#ffffff',
                                                strokeWeight: 2,
                                                scale: 12,
                                            }}
                                        />
                                    );
                                })
                            )}
                        </React.Fragment>
                    );
                })}
                
                {/* Add a click handler on the map to collapse any expanded groups */}
                {activeGroup && (
                    <GroundOverlay
                        key="map-overlay"
                        url="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                        bounds={{
                            north: 85,
                            south: -85,
                            east: 180,
                            west: -180
                        }}
                        opacity={0.01}
                        onClick={() => setActiveGroup(null)}
                    />
                )}
                
                {/* InfoWindow for selected marker */}
                {selectedMarker && (
                    <InfoWindow
                        position={selectedMarker.displayPosition || selectedMarker.position}
                        onCloseClick={() => {
                            setSelectedMarker(null);
                            // Also collapse any expanded group
                            setActiveGroup(null);
                        }}
                        options={{
                            pixelOffset: new google.maps.Size(0, -10)
                        }}
                    >
                        <Box sx={{ 
                            padding: 1.5, 
                            maxWidth: 280,
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            {selectedMarker.type === 'patient' ? (
                                // Patient InfoWindow Content
                                <>
                                    <Typography variant="subtitle1" component="div" sx={{ 
                                        fontWeight: 'bold',
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        pb: 0.5,
                                        mb: 1
                                    }}>
                                        {selectedMarker.title.split(' - ')[0]} {/* Just the name without visit type */}
                                    </Typography>
                                    
                                    {selectedMarker.visitType && (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            mb: 1,
                                            p: 0.5,
                                            bgcolor: `${getColorForVisitType(selectedMarker.visitType)}20`,
                                            borderRadius: 1
                                        }}>
                                            <Box 
                                                sx={{ 
                                                    width: 12, 
                                                    height: 12, 
                                                    borderRadius: '50%',
                                                    bgcolor: getColorForVisitType(selectedMarker.visitType),
                                                    mr: 1
                                                }} 
                                            />
                                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                {selectedMarker.visitType === 'HB' ? 'Hausbesuch' : 
                                                 selectedMarker.visitType === 'TK' ? 'Telefonkontakt' :
                                                 selectedMarker.visitType === 'NA' ? 'Neuaufnahme' : selectedMarker.visitType}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {/* Find patient and their appointments */}
                                    {(() => {
                                        const patient = patients.find(p => p.id === selectedMarker.patientId);
                                        if (!patient) return null;
                                        
                                        // Get all appointments for this patient
                                        const patientAppointments = appointments.filter(a => a.patient_id === patient.id);
                                        
                                        // Group appointments by weekday
                                        const appointmentsByDay: Record<string, Appointment[]> = {};
                                        patientAppointments.forEach(app => {
                                            if (!appointmentsByDay[app.weekday]) {
                                                appointmentsByDay[app.weekday] = [];
                                            }
                                            appointmentsByDay[app.weekday].push(app);
                                        });
                                        
                                        return (
                                            <>
                                                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
                                                    Adresse:
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                                                    {patient.street}<br/>
                                                    {patient.zip_code} {patient.city}
                                                </Typography>
                                                
                                                {patient.tour !== undefined && patient.tour !== null && (
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        mb: 1
                                                    }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
                                                        </Typography>
                                                        <Chip 
                                                            label={`Tour ${patient.tour}`} 
                                                            size="small"
                                                            sx={{ 
                                                                height: 24,
                                                                bgcolor: getColorForTour(patient.tour),
                                                                color: 'white'
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            ) : (
                                // Employee InfoWindow Content
                                <>
                                    <Typography variant="subtitle1" component="div" sx={{ 
                                        fontWeight: 'bold',
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        pb: 0.5,
                                        mb: 1
                                    }}>
                                        {selectedMarker.title.split(' - ')[0]} {/* Just the name without function */}
                                    </Typography>
                                    
                                    {/* Employee function/role */}
                                    {selectedMarker.employeeType && (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            mb: 1.5,
                                            p: 0.5,
                                            bgcolor: `${getColorForEmployeeType(selectedMarker.employeeType)}20`,
                                            borderRadius: 1
                                        }}>
                                            <Box 
                                                sx={{ 
                                                    width: 12, 
                                                    height: 12, 
                                                    borderRadius: '50%',
                                                    bgcolor: getColorForEmployeeType(selectedMarker.employeeType),
                                                    mr: 1
                                                }} 
                                            />
                                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                {selectedMarker.employeeType}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {/* Find employee details */}
                                    {(() => {
                                        const employee = employees.find(e => e.id === selectedMarker.employeeId);
                                        if (!employee) return null;
                                        
                                        // Get all routes for this employee
                                        const employeeRoutes = routes.filter(r => r.employee_id === employee.id);
                                        
                                        return (
                                            <>
                                                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
                                                    Adresse:
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                                                    {employee.street}<br/>
                                                    {employee.zip_code} {employee.city}
                                                </Typography>
                                                
                                                {employee.tour_number && (
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        mb: 1
                                                    }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
                                                        </Typography>
                                                        <Chip 
                                                            label={`Tour ${employee.tour_number}`} 
                                                            size="small"
                                                            sx={{ 
                                                                height: 24,
                                                                bgcolor: getColorForTour(employee.tour_number),
                                                                color: 'white'
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                                
                                                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
                                                    Arbeitszeit: {employee.work_hours}%
                                                </Typography>
                                            </>
                                        );
                                    })()}
                                </>
                            )}
                        </Box>
                    </InfoWindow>
                )}
            </GoogleMap>
        </Box>
    );
}; 