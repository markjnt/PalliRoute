import React from 'react';
import { DirectionsRenderer } from '@react-google-maps/api';
import { RoutePathData } from '../../types/mapTypes';

interface RouteDirectionsProps {
  routePaths: RoutePathData[];
  selectedWeekday: string;
}

/**
 * Component to render route directions on the map
 */
export const RouteDirections: React.FC<RouteDirectionsProps> = ({
  routePaths,
  selectedWeekday
}) => {
  return (
    <>
      {/* Render directions with better unique keys and extra check for non-empty routeOrder */}
      {routePaths.map((routePath, index) => (
        routePath.directions && 
        routePath.routeOrder && 
        routePath.routeOrder.length > 0 ? (
          <DirectionsRenderer
            key={`route-${routePath.routeId}-${selectedWeekday}-${index}`}
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
    </>
  );
}; 