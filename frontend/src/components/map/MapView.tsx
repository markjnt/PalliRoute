import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button, Typography, IconButton, Tooltip } from '@mui/material';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { configApi } from '../../services/api/config';
import { routesApi } from '../../services/api/routes';
import { appointmentsApi } from '../../services/api/appointments';
import { patientsApi } from '../../services/api/patients';
import { employeesApi } from '../../services/api/employees';
import { Route, Patient, Appointment, Employee } from '../../types/models';
import { useWeekday } from '../../contexts/WeekdayContext';
import { useTheme } from '@mui/material/styles';
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material';

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

// Employee type colors (in MUI style)
const employeeTypeColors: Record<string, string> = {
    'Arzt': '#FFC107', // Yellow - Doctor
    'Honorararzt': '#795548', // Brown - Freelance doctor
    'default': '#9c27b0' // Purple - PDL, Physiotherapie, Pflegekraft, etc.
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
    employeeType?: string; // Job title for employees
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
    
    // State for actual data
    const [routes, setRoutes] = React.useState<Route[]>([]);
    const [allRoutes, setAllRoutes] = React.useState<Route[]>([]);
    const [employees, setEmployees] = React.useState<Employee[]>([]);
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    
    const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
    
    // Fetch all necessary data
    const fetchData = React.useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        if (!showLoading) setIsRefreshing(true);
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
            
            // Update last refreshed timestamp
            setLastRefreshed(new Date());
            
        } catch (err) {
            console.error('Error fetching data:', err);
            setMapError('Fehler beim Laden der Daten');
        } finally {
            if (showLoading) setLoading(false);
            if (!showLoading) setIsRefreshing(false);
        }
    }, []);
    
    // Initial data fetch
    React.useEffect(() => {
        if (isLoaded) {
            fetchData(true);
        }
    }, [isLoaded, fetchData]);
    
    // Handle manual refresh
    const handleRefresh = () => {
        fetchData(false);
    };
    
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
            if (!window.google || !window.google.maps || !map) {
                return;
            }
            
            setLoading(true);
            const newMarkers: MarkerData[] = [];
            
            try {
                // Create employee markers for all active employees
                // This should work even if there are no patients or appointments
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
                    
                    // Create patient markers for all appointments (HB, TK, and NA) on this day
                    for (const appointment of appointmentsForDay) {
                        const patient = patients.find(p => p.id === appointment.patient_id);
                        if (patient) {
                            const patientMarkerData = createPatientMarkerData(patient, appointment);
                            if (patientMarkerData) newMarkers.push(patientMarkerData);
                        }
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
    }, [selectedWeekday, employees, patients, appointments, map]);
    
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
                employeeType: employee.function
            };
        } else {
            // If no coordinates, log warning and skip
            console.warn(`No coordinates for employee: ${employee.first_name} ${employee.last_name}`);
            return null;
        }
    };
    
    // Create patient marker data with appointment type using latitude and longitude from backend
    const createPatientMarkerData = (patient: Patient, appointment: Appointment): MarkerData | null => {
        // Check if we have latitude and longitude from the backend
        if (patient.latitude && patient.longitude) {
            // Create position using coordinates from backend
            const position = new google.maps.LatLng(patient.latitude, patient.longitude);
            
            return {
                position,
                title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type}`,
                type: 'patient',
                visitType: appointment.visit_type
            };
        } else {
            // If no coordinates, log warning and skip
            console.warn(`No coordinates for patient: ${patient.first_name} ${patient.last_name}`);
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
                {/* Render markers */}
                {markers.map((marker, index) => (
                    <Marker
                        key={`${marker.type}-${index}`}
                        position={marker.position}
                        title={marker.title}
                        label={marker.type === 'employee' ? undefined : marker.label}
                        icon={marker.type === 'employee' ? {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: getColorForEmployeeType(marker.employeeType),
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