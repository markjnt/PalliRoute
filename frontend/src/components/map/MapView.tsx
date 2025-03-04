import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { configApi } from '../../services/api/config';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 50.9375, // Köln
    lng: 6.9603
};

const defaultZoom = 12;

export const MapView: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchApiKey = async () => {
            try {
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

    return <MapContent apiKey={apiKey} />;
};

interface MapContentProps {
    apiKey: string;
}

const MapContent: React.FC<MapContentProps> = ({ apiKey }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: ['places']
    });

    const [map, setMap] = React.useState<google.maps.Map | null>(null);

    const onLoad = React.useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(() => {
        setMap(null);
    }, []);

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
        <Box sx={{ width: '100%', height: '100%' }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={defaultZoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    zoomControl: true,
                    mapTypeControl: false,
                    scaleControl: true,
                    streetViewControl: false,
                    rotateControl: false,
                    fullscreenControl: false
                }}
            >
                {/* Markers and Routes will be added here */}
            </GoogleMap>
        </Box>
    );
}; 