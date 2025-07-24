import React from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 51.5,
  lng: 7.5
};

const defaultZoom = 10;

export interface MapContainerProps {
  apiKey: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({ apiKey }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    language: 'de',
    region: 'DE'
  });

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={defaultZoom}
    />
  );
};