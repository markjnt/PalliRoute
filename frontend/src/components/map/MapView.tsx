import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { configApi } from '../../services/api/config';
import { routesApi } from '../../services/api/routes';
import { appointmentsApi } from '../../services/api/appointments';
import { patientsApi } from '../../services/api/patients';
import { employeesApi } from '../../services/api/employees';
import { Route, Patient, Appointment, Employee } from '../../types/models';
import { useWeekday } from '../../contexts/WeekdayContext';
import { useTheme } from '@mui/material/styles';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 50.9375, // Köln
    lng: 6.9603
};

const defaultZoom = 12;

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

// Appointment type colors (in MUI style)
const appointmentTypeColors: Record<string, string> = {
    'HB': '#2196F3', // Blue - Home visit (Hausbesuch)
    'TK': '#4CAF50', // Green - Phone call (Telefonkontakt)
    'NA': '#d32f2f', // Red - New admission (Neuaufnahme)
    'default': '#9E9E9E' // Grey - Default for unknown types
};

// Get current weekday in lowercase English (e.g., 'monday')
const getCurrentWeekday = (): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    return days[today];
};

// Geocoding cache to avoid redundant requests
interface GeocodeCacheEntry {
    address: string;
    position: google.maps.LatLng;
    timestamp: number;
}

const geocodeCache: GeocodeCacheEntry[] = [];
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const MapView: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const { selectedWeekday } = useWeekday(); // Holen des Wochentags aus dem Context
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
}

const MapContent: React.FC<MapContentProps> = ({ apiKey, selectedWeekday }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries,
        language: 'de',
        region: 'DE'
    });
    const theme = useTheme();

    const [map, setMap] = React.useState<google.maps.Map | null>(null);
    const [markers, setMarkers] = React.useState<MarkerData[]>([]);
    const [mapError, setMapError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [geocodingStatus, setGeocodingStatus] = React.useState<string | null>(null);
    
    // State for actual data
    const [routes, setRoutes] = React.useState<Route[]>([]);
    const [allRoutes, setAllRoutes] = React.useState<Route[]>([]);
    const [employees, setEmployees] = React.useState<Employee[]>([]);
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    
    // Geocode an address to coordinates
    const geocodeAddress = React.useCallback(
        async (address: string): Promise<google.maps.LatLng | null> => {
            // Check cache first
            const now = Date.now();
            const cachedEntry = geocodeCache.find(entry => entry.address === address);
            
            if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_EXPIRY_MS) {
                return cachedEntry.position;
            }
            
            // Clear expired entries
            const validEntries = geocodeCache.filter(
                entry => (now - entry.timestamp) < CACHE_EXPIRY_MS
            );
            geocodeCache.length = 0;
            geocodeCache.push(...validEntries);
            
            if (!window.google || !window.google.maps) {
                return null;
            }
            
            try {
                setGeocodingStatus(`Geocoding: ${address}`);
                
                return new Promise((resolve) => {
                    const geocoder = new google.maps.Geocoder();
                    
                    geocoder.geocode({ address }, (results, status) => {
                        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                            const location = results[0].geometry.location;
                            const position = new google.maps.LatLng(
                                location.lat(),
                                location.lng()
                            );
                            
                            // Cache the result
                            geocodeCache.push({
                                address,
                                position,
                                timestamp: now
                            });
                            
                            resolve(position);
                        } else {
                            console.error(`Geocoding failed for address: ${address}, status: ${status}`);
                            resolve(null);
                        }
                    });
                });
            } catch (err) {
                console.error('Error geocoding address:', err);
                return null;
            } finally {
                setGeocodingStatus(null);
            }
        },
        []
    );
    
    // Fetch all necessary data
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all routes with route_order
                const routesData = await routesApi.getRoutes();
                setAllRoutes(routesData);
                
                // Fetch all employees
                const employeesData = await employeesApi.getAll();
                setEmployees(employeesData);
                
                // Fetch all appointments
                const appointmentsData = await appointmentsApi.getAll();
                setAppointments(appointmentsData);
                
                // Fetch all patients
                const patientsData = await patientsApi.getAll();
                setPatients(patientsData);
                
            } catch (err) {
                console.error('Error fetching data:', err);
                setMapError('Fehler beim Laden der Daten');
            } finally {
                setLoading(false);
            }
        };
        
        if (isLoaded) {
            fetchData();
        }
    }, [isLoaded]);
    
    // Filter routes when selected weekday changes
    React.useEffect(() => {
        if (allRoutes.length > 0) {
            const filteredRoutes = allRoutes.filter(route => route.weekday === selectedWeekday);
            setRoutes(filteredRoutes);
            
            // Reset markers when day changes
            setMarkers([]);
        }
    }, [selectedWeekday, allRoutes]);
    
    // Create markers for all employees and appointments for the selected day
    React.useEffect(() => {
        const createMarkers = async () => {
            if (!window.google || !window.google.maps || employees.length === 0 || 
                patients.length === 0 || appointments.length === 0 || !map) {
                return;
            }
            
            setLoading(true);
            const newMarkers: MarkerData[] = [];
            
            try {
                // Get all appointments for the selected day with a non-empty visit_type
                const appointmentsForDay = appointments.filter(appointment => 
                    appointment.weekday === selectedWeekday && 
                    appointment.visit_type && 
                    appointment.visit_type.trim() !== ''
                );
                
                // Get unique employee IDs from appointments
                const employeeIdsFromAppointments = Array.from(new Set(
                    appointmentsForDay
                        .filter(a => a.employee_id !== undefined)
                        .map(a => a.employee_id as number)
                ));
                
                // Create employee markers
                for (const employeeId of employeeIdsFromAppointments) {
                    const employee = employees.find(e => e.id === employeeId);
                    if (employee) {
                        const employeeMarkerData = await createEmployeeMarkerData(employee);
                        if (employeeMarkerData) newMarkers.push(employeeMarkerData);
                    }
                }
                
                // Create patient markers for all appointments (HB, TK, and NA) on this day
                for (const appointment of appointmentsForDay) {
                    const patient = patients.find(p => p.id === appointment.patient_id);
                    if (patient) {
                        const patientMarkerData = await createPatientMarkerData(patient, appointment);
                        if (patientMarkerData) newMarkers.push(patientMarkerData);
                    }
                }
                
                // Update state with all new markers
                setMarkers(newMarkers);
                
            } catch (err) {
                console.error('Error creating markers:', err);
                setMapError('Fehler beim Erstellen der Marker');
            } finally {
                setLoading(false);
            }
        };
        
        createMarkers();
    }, [selectedWeekday, employees, patients, appointments, map, geocodeAddress]);
    
    // Create employee marker data
    const createEmployeeMarkerData = async (employee: Employee): Promise<MarkerData | null> => {
        if (!employee.street || !employee.zip_code || !employee.city) return null;
        
        try {
            // Create a complete address
            const address = `${employee.street}, ${employee.zip_code} ${employee.city}, Deutschland`;
            
            // Geocode the address
            const position = await geocodeAddress(address);
            if (!position) {
                console.warn(`Could not geocode employee address: ${address}`);
                return null;
            }
            
            return {
                position,
                title: `${employee.first_name} ${employee.last_name}`,
                type: 'employee'
            };
            
        } catch (err) {
            console.error('Error creating employee marker:', err);
            return null;
        }
    };
    
    // Create patient marker data with appointment type
    const createPatientMarkerData = async (patient: Patient, appointment: Appointment): Promise<MarkerData | null> => {
        if (!patient.street || !patient.zip_code || !patient.city) return null;
        
        try {
            // Create a complete address
            const address = `${patient.street}, ${patient.zip_code} ${patient.city}, Deutschland`;
            
            // Geocode the address
            const position = await geocodeAddress(address);
            if (!position) {
                console.warn(`Could not geocode patient address: ${address}`);
                return null;
            }
            
            return {
                position,
                title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type}`,
                type: 'patient',
                visitType: appointment.visit_type
            };
            
        } catch (err) {
            console.error('Error creating patient marker:', err);
            return null;
        }
    };

    const onLoad = React.useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(() => {
        setMarkers([]);
        setMap(null);
    }, []);

    // Get color for appointment type
    const getColorForVisitType = (visitType?: string): string => {
        if (!visitType) return appointmentTypeColors.default;
        return appointmentTypeColors[visitType] || appointmentTypeColors.default;
    };

    if (!isLoaded) {
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
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Status indicators */}
            {(loading || mapError || geocodingStatus) && (
                <Box sx={{ 
                    position: 'absolute', 
                    top: 16,
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    maxWidth: '80%'
                }}>
                    {loading && <CircularProgress size={24} sx={{ mr: 2 }} />}
                    {geocodingStatus && (
                        <Alert severity="info" variant="filled" sx={{ mb: 2 }}>
                            {geocodingStatus}
                        </Alert>
                    )}
                    {mapError && <Alert severity="error" variant="filled">{mapError}</Alert>}
                </Box>
            )}
            
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={defaultZoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
            >
                {/* Render markers */}
                {markers.map((marker, index) => (
                    <Marker
                        key={`${marker.type}-${index}`}
                        position={marker.position}
                        title={marker.title}
                        label={marker.type === 'employee' ? undefined : marker.label}
                        icon={marker.type === 'employee' ? {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#9c27b0',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                            scale: 8,
                        } : {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: getColorForVisitType(marker.visitType),
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                            scale: 8,
                        }}
                    />
                ))}
            </GoogleMap>
        </Box>
    );
}; 